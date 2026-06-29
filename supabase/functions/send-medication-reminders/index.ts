import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TIME_ZONE = "Asia/Jakarta";

const MED_LEAD_MINUTES = 15;
const CHECKUP_LEAD_MINUTES = 60;
const CHECKUP_H1_AT_MINUTES = 8 * 60; // 08:00
const WINDOW_MINUTES = 1;

interface WibNow {
  dateISO: string; // YYYY-MM-DD in WIB
  minutes: number; // minutes since WIB midnight
}

function wibNow(): WibNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateISO, minutes };
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseMinutes(timeStr: string): number | null {
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function withinWindow(reminderMinutes: number, nowMinutes: number): boolean {
  const diff = reminderMinutes - nowMinutes;
  return diff >= -WINDOW_MINUTES && diff <= WINDOW_MINUTES;
}

async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: data ?? {},
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

// Push tokens of family members who still have the given reminder type enabled.
async function recipientTokens(
  familyId: string,
  prefColumn: "notify_medications" | "notify_checkups",
): Promise<string[]> {
  const { data: members } = await supabase
    .from("profiles")
    .select(`push_token, ${prefColumn}`)
    .eq("family_id", familyId)
    .eq(prefColumn, true)
    .not("push_token", "is", null);

  return (members?.map((m) => m.push_token).filter(Boolean) as string[]) ?? [];
}

// Reserve a reminder in notification_logs. Returns true only for the caller that
// wins the unique constraint, so exactly one cron tick sends each reminder.
async function claimReminder(input: {
  familyId: string;
  refId: string;
  refType: "medication" | "appointment";
  kind: string;
  slotKey: string;
  slotDate: string;
}): Promise<boolean> {
  const { error } = await supabase.from("notification_logs").insert({
    family_id: input.familyId,
    ref_id: input.refId,
    ref_type: input.refType,
    kind: input.kind,
    slot_key: input.slotKey,
    slot_date: input.slotDate,
  });

  // 23505 = unique_violation → another tick already claimed this reminder.
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

async function processMedications(now: WibNow) {
  const { data: medications } = await supabase
    .from("medications")
    .select(
      `id, name, dose, schedules, patient_id,
       patients!inner ( id, name, family_id )`,
    )
    .eq("is_active", true);

  if (!medications?.length) return;

  for (const med of medications) {
    const patient = med.patients as any;
    const familyId = patient.family_id as string;

    for (const scheduleRaw of (med.schedules as string[]) ?? []) {
      const [scheduleKey, timeStr] = scheduleRaw.split("|");
      if (!timeStr) continue;

      const scheduledMinutes = parseMinutes(timeStr);
      if (scheduledMinutes === null) continue;
      if (!withinWindow(scheduledMinutes - MED_LEAD_MINUTES, now.minutes)) {
        continue;
      }

      // Skip if this dose was already confirmed for today.
      const { data: log } = await supabase
        .from("medication_logs")
        .select("confirmed")
        .eq("medication_id", med.id)
        .eq("date", now.dateISO)
        .eq("schedule", scheduleKey)
        .maybeSingle();
      if (log?.confirmed) continue;

      const claimed = await claimReminder({
        familyId,
        refId: med.id,
        refType: "medication",
        kind: "dose",
        slotKey: scheduleKey,
        slotDate: now.dateISO,
      });
      if (!claimed) continue;

      const tokens = await recipientTokens(familyId, "notify_medications");
      if (!tokens.length) continue;

      await sendPushNotification(
        tokens,
        "⏰ Pengingat Minum Obat",
        `${med.name} ${med.dose} untuk ${patient.name} — ${MED_LEAD_MINUTES} menit lagi (${timeStr})`,
        {
          type: "medication",
          medication_id: med.id,
          patient_id: patient.id,
          schedule: scheduleKey,
          date: now.dateISO,
        },
      );
    }
  }
}

async function processAppointments(now: WibNow) {
  const tomorrow = addDaysISO(now.dateISO, 1);

  // Only the two days that can still trigger a reminder: today (hari H) and
  // tomorrow (its H-1 reminder fires today).
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `id, family_id, doctor_name, hospital_name, scheduled_date, scheduled_time, status,
       patients!inner ( id, name )`,
    )
    .eq("status", "scheduled")
    .in("scheduled_date", [now.dateISO, tomorrow]);

  if (!appointments?.length) return;

  for (const appt of appointments) {
    const patient = appt.patients as any;
    const familyId = appt.family_id as string;
    const scheduledTime = (appt.scheduled_time as string) || "09:00";

    const isToday = appt.scheduled_date === now.dateISO;
    const kind = isToday ? "hari_h" : "h1";

    // H-1 fires at a fixed morning time; hari H fires shortly before the visit.
    const scheduledMinutes = parseMinutes(scheduledTime);
    if (scheduledMinutes === null) continue;
    const reminderMinutes = isToday
      ? scheduledMinutes - CHECKUP_LEAD_MINUTES
      : CHECKUP_H1_AT_MINUTES;
    if (!withinWindow(reminderMinutes, now.minutes)) continue;

    const claimed = await claimReminder({
      familyId,
      refId: appt.id,
      refType: "appointment",
      kind,
      slotKey: "",
      slotDate: now.dateISO,
    });
    if (!claimed) continue;

    const tokens = await recipientTokens(familyId, "notify_checkups");
    if (!tokens.length) continue;

    const doctor = appt.doctor_name ? ` dengan ${appt.doctor_name}` : "";
    const title = isToday ? "🏥 Cek-up Hari Ini" : "🗓️ Cek-up Besok";
    const body = isToday
      ? `${patient.name} ada cek-up${doctor} pukul ${scheduledTime}. Siapkan keperluannya ya.`
      : `Besok ${patient.name} ada cek-up${doctor} pukul ${scheduledTime}. Jangan lupa siapkan berkas & resep.`;

    await sendPushNotification(tokens, title, body, {
      type: "appointment",
      appointment_id: appt.id,
      patient_id: patient.id,
      date: now.dateISO,
    });
  }
}

Deno.serve(async () => {
  const now = wibNow();
  await processMedications(now);
  await processAppointments(now);
  return new Response("ok");
});
