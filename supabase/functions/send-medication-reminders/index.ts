import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

Deno.serve(async () => {
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];

  // Ambil semua medications aktif beserta jadwalnya
  const { data: medications } = await supabase
    .from("medications")
    .select(
      `
      id,
      name,
      dose,
      schedules,
      patient_id,
      patients!inner (
        id,
        name,
        family_id
      )
    `,
    )
    .eq("is_active", true);

  if (!medications?.length) return new Response("ok");

  for (const med of medications) {
    const patient = med.patients as any;
    const familyId = patient.family_id;

    for (const scheduleRaw of med.schedules as string[]) {
      const [scheduleKey, timeStr] = scheduleRaw.split("|");
      if (!timeStr) continue;

      const [hour, minute] = timeStr.split(":").map(Number);

      // Waktu jadwal hari ini
      const scheduledAt = new Date(now);
      scheduledAt.setHours(hour, minute, 0, 0);

      // Kirim notifikasi 10 menit sebelum
      const reminderAt = new Date(scheduledAt.getTime() - 10 * 60 * 1000);
      const diffMinutes = (reminderAt.getTime() - now.getTime()) / 60000;

      // Window ±1 menit dari sekarang
      if (diffMinutes < -1 || diffMinutes > 1) continue;

      // Cek apakah sudah dikirim
      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("ref_id", med.id)
        .eq("ref_type", "medication")
        .eq("scheduled_for", scheduledAt.toISOString())
        .single();

      if (existing) continue;

      // Cek apakah sudah dikonfirmasi
      const { data: log } = await supabase
        .from("medication_logs")
        .select("confirmed")
        .eq("medication_id", med.id)
        .eq("date", todayISO)
        .eq("schedule", scheduleKey)
        .single();

      if (log?.confirmed) continue;

      // Ambil semua push token anggota keluarga
      const { data: members } = await supabase
        .from("profiles")
        .select("push_token, full_name")
        .eq("family_id", familyId)
        .not("push_token", "is", null);

      const tokens = members
        ?.map((m) => m.push_token)
        .filter(Boolean) as string[];
      if (!tokens.length) continue;

      await sendPushNotification(
        tokens,
        "⏰ Pengingat Minum Obat",
        `${med.name} ${med.dose} untuk ${patient.name} — 10 menit lagi (${timeStr})`,
        {
          type: "medication",
          medication_id: med.id,
          patient_id: patient.id,
          schedule: scheduleKey,
          date: todayISO,
        },
      );

      // Catat sudah dikirim
      await supabase.from("notification_logs").insert({
        family_id: familyId,
        ref_id: med.id,
        ref_type: "medication",
        scheduled_for: scheduledAt.toISOString(),
        sent_at: now.toISOString(),
      });
    }
  }

  return new Response("ok");
});
