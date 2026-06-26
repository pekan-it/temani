import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Warna ────────────────────────────────────────────────────────────────────
const PRIMARY = "#2D6A4F";
const PRIMARY_LIGHT = "#E8F5F0";
const BG = "#F8FAF9";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#A0B5AC";
const BORDER = "#E8F0ED";
const BLUE = "#3B82F6";
const PINK = "#EC4899";
const ORANGE = "#F59E0B";
const PURPLE = "#8B5CF6";

// ─── Tipe data (disesuaikan dengan skema DB) ──────────────────────────────────
type Patient = {
  id: string;
  family_id: string;
  name: string;
  age: number;
  diagnosis: string;
  notes: string | null; // dipakai sebagai gender
  created_at: string;
};

type Medication = {
  id: string;
  patient_id: string;
  name: string;
  dose: string;
  schedules: string[];
  stock: number;
  expiry_date: string | null;
  is_active: boolean;
};

type Appointment = {
  id: string;
  patient_id: string;
  family_id: string;
  hospital_name: string;
  doctor_name: string;
  appointment_type: "kontrol_rutin" | "ambil_resep" | "cek_lab" | "lainnya";
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatAppointmentType(type: Appointment["appointment_type"]): string {
  const map: Record<Appointment["appointment_type"], string> = {
    kontrol_rutin: "Kontrol Rutin",
    ambil_resep: "Ambil Resep",
    cek_lab: "Cek Lab",
    lainnya: "Lainnya",
  };
  return map[type] ?? type;
}

function formatScheduleLabel(s: string): string {
  const map: Record<string, string> = {
    pagi: "Pagi (07:00)",
    siang: "Siang (12:00)",
    malam: "Malam (19:00)",
    sebelum_tidur: "Sebelum Tidur (21:00)",
  };
  return map[s] ?? s;
}

// ─── Layar Utama ──────────────────────────────────────────────────────────────
export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const [patientRes, medRes, apptRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase
          .from("medications")
          .select(
            "id, patient_id, name, dose, schedules, stock, expiry_date, is_active",
          )
          .eq("patient_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select(
            "id, patient_id, family_id, hospital_name, doctor_name, appointment_type, scheduled_date, scheduled_time, status, notes",
          )
          .eq("patient_id", id)
          .order("scheduled_date", { ascending: true }),
      ]);

      if (patientRes.error) throw patientRes.error;
      if (medRes.error) throw medRes.error;
      if (apptRes.error) throw apptRes.error;
      setPatient(patientRes.data);
      setMedications((medRes.data as Medication[]) ?? []);
      setAppointments((apptRes.data as Appointment[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  // ─── Gender helpers ───────────────────────────────────────────────────────
  function getGenderIcon(notes: string | null): string {
    if (notes === "Laki-laki") return "male";
    if (notes === "Perempuan") return "female";
    return "person";
  }

  function getGenderColor(notes: string | null): string {
    if (notes === "Laki-laki") return BLUE;
    if (notes === "Perempuan") return PINK;
    return TEXT_MUTED;
  }

  function getAgeLabel(age: number): string {
    if (age < 13) return "Anak-anak";
    if (age < 18) return "Remaja";
    if (age < 60) return "Dewasa";
    return "Lansia";
  }

  // ─── Date helpers ─────────────────────────────────────────────────────────
  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // scheduled_time dari DB berupa "HH:MM:SS"
  function formatTime(timeStr: string): string {
    return timeStr.slice(0, 5);
  }

  // ─── Appointment helpers ──────────────────────────────────────────────────
  function getAppointmentStatus(appt: Appointment): {
    label: string;
    color: string;
    bg: string;
  } {
    if (appt.status === "completed")
      return { label: "Selesai", color: PRIMARY, bg: PRIMARY_LIGHT };
    if (appt.status === "cancelled")
      return { label: "Dibatalkan", color: "#EF4444", bg: "#FEF2F2" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = new Date(appt.scheduled_date + "T00:00:00") < today;
    if (isPast) return { label: "Terlewat", color: ORANGE, bg: "#FFFBEB" };
    return { label: "Akan Datang", color: PURPLE, bg: "#F5F3FF" };
  }

  function getUpcomingAppointments(): Appointment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointments.filter(
      (a) =>
        a.status === "scheduled" &&
        new Date(a.scheduled_date + "T00:00:00") >= today,
    );
  }

  function getPastAppointments(): Appointment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointments.filter(
      (a) =>
        a.status !== "scheduled" ||
        new Date(a.scheduled_date + "T00:00:00") < today,
    );
  }

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Memuat detail pasien...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !patient) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Gagal memuat data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Derived data ─────────────────────────────────────────────────────────
  const genderColor = getGenderColor(patient.notes);
  const genderIcon = getGenderIcon(patient.notes);
  const upcomingAppts = getUpcomingAppointments();
  const pastAppts = getPastAppointments();
  const activeMeds = medications.filter((m) => m.is_active);
  const inactiveMeds = medications.filter((m) => !m.is_active);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pasien</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View
            style={[
              styles.profileAvatar,
              {
                backgroundColor:
                  patient.notes === "Laki-laki" ? "#EFF6FF" : "#FDF2F8",
              },
            ]}
          >
            <Ionicons name={genderIcon as any} size={36} color={genderColor} />
          </View>
          <Text style={styles.profileName}>{patient.name}</Text>
          <View style={styles.profileBadgeRow}>
            <View style={[styles.badge, { backgroundColor: "#E8F5F0" }]}>
              <Ionicons name="calendar-outline" size={12} color={PRIMARY} />
              <Text style={[styles.badgeText, { color: PRIMARY }]}>
                {patient.age} tahun · {getAgeLabel(patient.age)}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    patient.notes === "Laki-laki" ? "#EFF6FF" : "#FDF2F8",
                },
              ]}
            >
              <Ionicons
                name={genderIcon as any}
                size={12}
                color={genderColor}
              />
              <Text style={[styles.badgeText, { color: genderColor }]}>
                {patient.notes ?? "Tidak diketahui"}
              </Text>
            </View>
          </View>

          {patient.diagnosis && patient.diagnosis !== "-" && (
            <View style={styles.diagnosisBox}>
              <Ionicons name="medical-outline" size={14} color={TEXT_MUTED} />
              <Text style={styles.diagnosisText}>{patient.diagnosis}</Text>
            </View>
          )}
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeMeds.length}</Text>
            <Text style={styles.statLabel}>Obat Aktif</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{upcomingAppts.length}</Text>
            <Text style={styles.statLabel}>Jadwal Cek-up</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pastAppts.length}</Text>
            <Text style={styles.statLabel}>Riwayat</Text>
          </View>
        </View>

        {/* ── Obat Aktif ── */}
        <SectionHeader
          icon="medkit"
          title="Obat yang Dikonsumsi"
          count={activeMeds.length}
          accent={PRIMARY}
        />
        {activeMeds.length === 0 ? (
          <EmptyCard
            icon="medkit-outline"
            message="Belum ada obat yang terdaftar"
          />
        ) : (
          activeMeds.map((med) => (
            <View key={med.id} style={styles.medCard}>
              <View style={styles.medIconWrap}>
                <Ionicons name="medkit-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                <View style={styles.medMeta}>
                  {med.dose ? (
                    <Chip
                      icon="flask-outline"
                      label={med.dose}
                      color={PRIMARY}
                    />
                  ) : null}
                  {med.schedules?.map((s) => (
                    <Chip
                      key={s}
                      icon="time-outline"
                      label={formatScheduleLabel(s)}
                      color={ORANGE}
                    />
                  ))}
                  <Chip
                    icon="cube-outline"
                    label={`Stok: ${med.stock}`}
                    color={PURPLE}
                  />
                </View>
                {med.expiry_date ? (
                  <Text style={styles.medNote}>
                    Exp: {formatDate(med.expiry_date)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        {/* ── Obat Tidak Aktif ── */}
        {inactiveMeds.length > 0 && (
          <>
            <SectionHeader
              icon="archive"
              title="Obat Tidak Aktif"
              count={inactiveMeds.length}
              accent={TEXT_MUTED}
            />
            {inactiveMeds.map((med) => (
              <View key={med.id} style={[styles.medCard, { opacity: 0.55 }]}>
                <View
                  style={[styles.medIconWrap, { backgroundColor: "#F3F4F6" }]}
                >
                  <Ionicons
                    name="medkit-outline"
                    size={20}
                    color={TEXT_MUTED}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: TEXT_MUTED }]}>
                    {med.name}
                  </Text>
                  {med.dose ? (
                    <Text style={styles.medNote}>{med.dose}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Jadwal Cek-up ── */}
        <SectionHeader
          icon="calendar"
          title="Jadwal Cek-up"
          count={upcomingAppts.length}
          accent={PURPLE}
        />
        {upcomingAppts.length === 0 ? (
          <EmptyCard
            icon="calendar-outline"
            message="Tidak ada jadwal cek-up yang akan datang"
          />
        ) : (
          upcomingAppts.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              formatDate={formatDate}
              formatTime={formatTime}
              getAppointmentStatus={getAppointmentStatus}
            />
          ))
        )}

        {/* ── Riwayat Cek-up ── */}
        {pastAppts.length > 0 && (
          <>
            <SectionHeader
              icon="time"
              title="Riwayat Cek-up"
              count={pastAppts.length}
              accent={TEXT_MUTED}
            />
            {pastAppts.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                formatDate={formatDate}
                formatTime={formatTime}
                getAppointmentStatus={getAppointmentStatus}
                faded
              />
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  accent,
}: {
  icon: string;
  title: string;
  count: number;
  accent: string;
}) {
  return (
    <View style={sectionStyles.row}>
      <View
        style={[sectionStyles.iconWrap, { backgroundColor: accent + "18" }]}
      >
        <Ionicons name={icon as any} size={16} color={accent} />
      </View>
      <Text style={sectionStyles.title}>{title}</Text>
      <View
        style={[sectionStyles.countBadge, { backgroundColor: accent + "18" }]}
      >
        <Text style={[sectionStyles.countText, { color: accent }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

function Chip({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[chipStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

function EmptyCard({ icon, message }: { icon: string; message: string }) {
  return (
    <View style={emptyStyles.card}>
      <Ionicons name={icon as any} size={28} color="#C9D8D3" />
      <Text style={emptyStyles.text}>{message}</Text>
    </View>
  );
}

function AppointmentCard({
  appt,
  formatDate,
  formatTime,
  getAppointmentStatus,
  faded,
}: {
  appt: Appointment;
  formatDate: (d: string) => string;
  formatTime: (t: string) => string;
  getAppointmentStatus: (a: Appointment) => {
    label: string;
    color: string;
    bg: string;
  };
  faded?: boolean;
}) {
  const status = getAppointmentStatus(appt);
  const day = new Date(appt.scheduled_date + "T00:00:00").getDate();
  const month = new Date(appt.scheduled_date + "T00:00:00").toLocaleDateString(
    "id-ID",
    {
      month: "short",
    },
  );

  return (
    <View style={[apptStyles.card, faded && { opacity: 0.6 }]}>
      {/* Date strip */}
      <View style={apptStyles.dateStrip}>
        <Text style={apptStyles.dateDay}>{day}</Text>
        <Text style={apptStyles.dateMonth}>{month}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={apptStyles.topRow}>
          <Text style={apptStyles.doctorName}>{appt.doctor_name}</Text>
          <View
            style={[apptStyles.statusBadge, { backgroundColor: status.bg }]}
          >
            <Text style={[apptStyles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Tipe appointment */}
        <Text style={apptStyles.spec}>
          {formatAppointmentType(appt.appointment_type)}
        </Text>

        <View style={apptStyles.metaRow}>
          <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
          <Text style={apptStyles.metaText}>
            {formatTime(appt.scheduled_time)}
          </Text>
          <View style={apptStyles.dot} />
          <Ionicons name="location-outline" size={12} color={TEXT_MUTED} />
          <Text style={apptStyles.metaText} numberOfLines={1}>
            {appt.hospital_name}
          </Text>
        </View>

        {appt.notes ? (
          <Text style={apptStyles.apptNote}>{appt.notes}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14, color: TEXT_MUTED, marginTop: 8 },
  backBtn: { padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },

  scrollContent: { paddingBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 8,
  },
  profileBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  diagnosisBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAF9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  diagnosisText: { fontSize: 13, color: TEXT_MUTED, flex: 1 },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  statDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "500" },

  // Medication card
  medCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  medName: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  medMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  medNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 6, lineHeight: 16 },

  // Error
  errorTitle: { fontSize: 16, fontWeight: "600", color: TEXT_DARK },
  errorSub: { fontSize: 13, color: TEXT_MUTED, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIMARY,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: TEXT_DARK },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: { fontSize: 12, fontWeight: "700" },
});

const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: { fontSize: 11, fontWeight: "600" },
});

const emptyStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  text: { fontSize: 13, color: TEXT_MUTED, textAlign: "center" },
});

const apptStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  dateStrip: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingVertical: 8,
  },
  dateDay: { fontSize: 20, fontWeight: "800", color: PURPLE, lineHeight: 24 },
  dateMonth: {
    fontSize: 10,
    fontWeight: "600",
    color: PURPLE,
    textTransform: "uppercase",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  spec: { fontSize: 12, color: TEXT_MUTED, marginBottom: 4 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 12, color: TEXT_MUTED },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT_MUTED },
  apptNote: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 6,
    lineHeight: 16,
  },
});
