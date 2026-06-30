import { supabase } from "@/lib/supabase/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const isExpoGoEnvironment =
  Constants.appOwnership === "expo" || Constants.appOwnership === "guest";

const ANDROID_CHANNEL_ID = "default";

// Fallback jam per slot kalau data lama tersimpan tanpa "|HH:MM"
// (mis. obat yang diedit lewat layar detail yang belum punya time picker).
const DEFAULT_SCHEDULE_TIME: Record<string, string> = {
  pagi: "07:00",
  siang: "12:00",
  malam: "19:00",
  sebelum_tidur: "21:00",
};

const SCHEDULE_LABEL: Record<string, string> = {
  pagi: "Pagi",
  siang: "Siang",
  malam: "Malam",
  sebelum_tidur: "Sebelum Tidur",
};

// Cek-up: ingatkan H-1 pagi dan 1 jam sebelum jam kunjungan.
const CHECKUP_H1_HOUR = 8;
const CHECKUP_LEAD_MINUTES = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken() {
  if (!Device.isDevice || Platform.OS === "web") {
    return null;
  }

  if (isExpoGoEnvironment) {
    console.log(
      "[Temani] Push notifications skipped in Expo Go. Use a development build.",
    );
    return null;
  }

  const granted = await ensureLocalNotificationSetup();
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("[Temani] EAS projectId tidak ditemukan");
    return null;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ push_token: token } as any)
        .eq("id", user.id);
    }

    return token;
  } catch (error) {
    console.error("[Temani] Failed to register push token:", error);
    return null;
  }
}

// ─── Local scheduled reminders ────────────────────────────────────────────────
// Notifikasi lokal tidak butuh server/cron/internet dan tetap berbunyi walau app
// ditutup, jadi inilah mekanisme utama pengingat. Pipeline push (registerPushToken
// + Edge Function) tetap dipertahankan sebagai pelengkap agar anggota keluarga lain
// ikut menerima notifikasi.

// Minta izin notifikasi & siapkan channel Android. Mengembalikan true bila siap.
export async function ensureLocalNotificationSetup(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Pengingat Temani",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2D6A4F",
      sound: "default",
    });
  }

  return true;
}

// Rebuild SEMUA notifikasi lokal dari data Supabase. Idempoten: dipanggil saat app
// dibuka dan setiap kali obat/cek-up berubah, jadi jadwal selalu sinkron tanpa perlu
// melacak id notifikasi per-item.
export async function syncAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await ensureLocalNotificationSetup();
  if (!granted) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prefs } = await supabase
    .from("profiles")
    .select("notify_medications, notify_checkups")
    .eq("id", user.id)
    .maybeSingle<{
      notify_medications: boolean | null;
      notify_checkups: boolean | null;
    }>();

  // Default ON kalau kolom preferensi belum ada / belum diatur.
  const medsEnabled = prefs?.notify_medications ?? true;
  const checkupsEnabled = prefs?.notify_checkups ?? true;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (medsEnabled) await scheduleMedicationReminders();
  if (checkupsEnabled) await scheduleCheckupReminders();
}

function parseHHMM(value?: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

type MedicationReminderRow = {
  id: string;
  name: string;
  dose: string;
  schedules: string[] | null;
  patient: { name: string } | null;
};

async function scheduleMedicationReminders(): Promise<void> {
  const { data: medications } = await supabase
    .from("medications")
    .select("id, name, dose, schedules, patient:patients(name)")
    .eq("is_active", true)
    .returns<MedicationReminderRow[]>();

  for (const med of medications ?? []) {
    const patientName = med.patient?.name ? ` untuk ${med.patient.name}` : "";

    for (const raw of med.schedules ?? []) {
      const [key, time] = String(raw).split("|");
      const parsed = parseHHMM(time ?? DEFAULT_SCHEDULE_TIME[key]);
      if (!parsed) continue;

      const slotLabel = SCHEDULE_LABEL[key] ?? key;
      const displayTime = time ?? DEFAULT_SCHEDULE_TIME[key];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Waktunya Minum Obat",
          body: `${med.name} ${med.dose}${patientName} — ${slotLabel} (${displayTime})`,
          sound: "default",
          data: { type: "medication", medicationId: med.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parsed.hour,
          minute: parsed.minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }
}

// Bangun Date di zona waktu perangkat dari "YYYY-MM-DD" + "HH:MM[:SS]".
function buildLocalDate(dateISO: string, timeStr: string): Date | null {
  const [y, mo, d] = dateISO.split("-").map(Number);
  const parsed = parseHHMM(timeStr);
  if (!parsed || Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) {
    return null;
  }
  return new Date(y, mo - 1, d, parsed.hour, parsed.minute, 0, 0);
}

type CheckupReminderRow = {
  id: string;
  doctor_name: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  patient: { name: string } | null;
};

async function scheduleCheckupReminders(): Promise<void> {
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, doctor_name, scheduled_date, scheduled_time, status, patient:patients(name)",
    )
    .eq("status", "scheduled")
    .returns<CheckupReminderRow[]>();

  const now = Date.now();

  for (const appt of appointments ?? []) {
    const visitAt = buildLocalDate(
      appt.scheduled_date,
      appt.scheduled_time || "09:00",
    );
    if (!visitAt) continue;

    const patientName = appt.patient?.name ?? "Pasien";
    const doctor = appt.doctor_name ? ` dengan ${appt.doctor_name}` : "";
    const visitTime = String(appt.scheduled_time ?? "").slice(0, 5);

    // H-1 pukul 08:00
    const h1 = new Date(visitAt);
    h1.setDate(h1.getDate() - 1);
    h1.setHours(CHECKUP_H1_HOUR, 0, 0, 0);
    if (h1.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🗓️ Cek-up Besok",
          body: `Besok ${patientName} ada cek-up${doctor} pukul ${visitTime}. Jangan lupa siapkan berkas & resep.`,
          sound: "default",
          data: { type: "appointment", appointmentId: appt.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: h1,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }

    // T-60 menit sebelum jam kunjungan
    const lead = new Date(visitAt.getTime() - CHECKUP_LEAD_MINUTES * 60_000);
    if (lead.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏥 Cek-up Sebentar Lagi",
          body: `${patientName} ada cek-up${doctor} pukul ${visitTime}. Siapkan keperluannya ya.`,
          sound: "default",
          data: { type: "appointment", appointmentId: appt.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: lead,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }
}
