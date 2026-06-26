import { supabase } from "@/lib/supabase/client"; // ← sesuaikan path jika berbeda
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Tipe data ────────────────────────────────────────────────────────────────
type Profile = {
  id: string;
  full_name: string;
  role: "owner" | "caregiver";
  family_id: string;
};

type Patient = {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  notes: string | null;
};

type MedicationLog = {
  id: string;
  medication_id: string;
  patient_id: string;
  schedule: "pagi" | "siang" | "malam" | "sebelum_tidur";
  date: string;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  medications: { name: string; dose: string };
  patients: { name: string };
};

type Appointment = {
  id: string;
  patient_id: string;
  hospital_name: string;
  doctor_name: string;
  appointment_type: "kontrol_rutin" | "ambil_resep" | "cek_lab" | "lainnya";
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  patients: { name: string };
};

// ─── Warna tema ───────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#2D6A4F",
  primaryLight: "#52B788",
  accent: "#F4A261",
  surface: "#F8FAF9",
  card: "#FFFFFF",
  textPrimary: "#1B2D27",
  textSecondary: "#6B8F7E",
  textMuted: "#A0B5AC",
  danger: "#E76F51",
  success: "#52B788",
  warning: "#F4A261",
  border: "#E8F0ED",
};

const AVATAR_COLORS = ["#4A90A4", "#7B68EE", "#E76F51", "#52B788", "#F4A261"];

// ─── Helper ───────────────────────────────────────────────────────────────────
export function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("id-ID", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );

  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

// Dihitung fresh setiap komponen mount — tidak stale
function useGreeting(): string {
  return useMemo(() => getGreeting(), []);
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function getDaysLeft(scheduledDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(scheduledDate);
  target.setHours(0, 0, 0, 0);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function formatAppointmentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatScheduleLabel(
  schedule: "pagi" | "siang" | "malam" | "sebelum_tidur",
): string {
  const map = {
    pagi: "07:00",
    siang: "12:00",
    malam: "19:00",
    sebelum_tidur: "21:00",
  };
  return map[schedule];
}

function formatAppointmentType(
  type: "kontrol_rutin" | "ambil_resep" | "cek_lab" | "lainnya",
): string {
  const map = {
    kontrol_rutin: "Kontrol Rutin",
    ambil_resep: "Ambil Resep",
    cek_lab: "Cek Lab",
    lainnya: "Lainnya",
  };
  return map[type];
}

// ─── Hook: profil user yang login ────────────────────────────────────────────
function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("id, full_name, role, family_id")
        .eq("id", userId)
        .single()
        .then(({ data: p }) => {
          setProfile(p ?? null);
          setLoading(false);
        });
    });
  }, []);

  return { profile, loading };
}

// ─── Hook: semua data dashboard ───────────────────────────────────────────────
function useDashboardData(familyId: string | null | undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medLogs, setMedLogs] = useState<MedicationLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAll(isRefresh = false) {
    if (!familyId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);

    const today = getTodayISO();

    // 1. Pasien
    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, name, age, diagnosis, notes")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    const fetchedPatients: Patient[] = patientsData ?? [];
    setPatients(fetchedPatients);

    if (fetchedPatients.length === 0) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const patientIds = fetchedPatients.map((p) => p.id);

    // 2. Log obat hari ini
    const { data: logsData } = await supabase
      .from("medication_logs")
      .select(
        "id, medication_id, patient_id, schedule, date, confirmed, confirmed_by, confirmed_at, medications(name, dose), patients(name)",
      )
      .in("patient_id", patientIds)
      .eq("date", today)
      .order("schedule", { ascending: true });

    setMedLogs((logsData as unknown as MedicationLog[]) ?? []);

    // 3. Jadwal cek-up mendatang
    const { data: apptData } = await supabase
      .from("appointments")
      .select(
        "id, patient_id, hospital_name, doctor_name, appointment_type, scheduled_date, scheduled_time, status, notes, patients(name)",
      )
      .eq("family_id", familyId)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(5);

    setAppointments((apptData as unknown as Appointment[]) ?? []);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (familyId) fetchAll();
  }, [familyId]);

  return {
    patients,
    medLogs,
    appointments,
    loading,
    refreshing,
    refetch: () => fetchAll(true),
  };
}

// ─── Komponen: Header ─────────────────────────────────────────────────────────
function DashboardHeader({ profile }: { profile: Profile | null }) {
  const greeting = useGreeting();
  const firstName = profile?.full_name?.split(" ")[0] ?? "...";

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerGreeting}>{greeting},</Text>
        <Text style={styles.headerName}>{firstName}</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.notifButton}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={COLORS.textPrimary}
          />
          <View style={styles.notifBadge} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push("/(app)/settings")}
        >
          <Text style={styles.avatarText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Komponen: Kartu Pasien ───────────────────────────────────────────────────
function PatientCard({
  patient,
  index,
  isActive,
  onPress,
  medLogs,
}: {
  patient: Patient;
  index: number;
  isActive: boolean;
  onPress: () => void;
  medLogs: MedicationLog[];
}) {
  const patientLogs = medLogs.filter((l) => l.patient_id === patient.id);
  const confirmed = patientLogs.filter((l) => l.confirmed).length;
  const total = patientLogs.length;
  const careScore = total > 0 ? Math.round((confirmed / total) * 100) : 100;

  const scoreColor =
    careScore >= 80
      ? COLORS.success
      : careScore >= 60
        ? COLORS.warning
        : COLORS.danger;
  const scoreLabel =
    careScore >= 80
      ? "Sangat Baik"
      : careScore >= 60
        ? "Cukup Baik"
        : "Perlu Perhatian";

  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const conditions = patient.diagnosis
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <TouchableOpacity
      style={[styles.patientCard, isActive && styles.patientCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.patientAvatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.patientAvatarText}>
          {patient.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientMeta}>{patient.age} tahun</Text>
        <Text style={styles.patientName}>{patient.name}</Text>
        <View style={styles.patientTags}>
          {conditions.slice(0, 2).map((c) => (
            <View key={c} style={styles.conditionTag}>
              <Text style={styles.conditionTagText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.careScoreBox}>
        <Text style={[styles.careScoreNum, { color: scoreColor }]}>
          {careScore}
        </Text>
        <Text style={styles.careScoreLabel}>{scoreLabel}</Text>
        <View style={styles.careScoreBar}>
          <View
            style={[
              styles.careScoreBarFill,
              { width: `${careScore}%` as any, backgroundColor: scoreColor },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Komponen: Item Obat ──────────────────────────────────────────────────────
function MedicationItem({
  log,
  onConfirm,
}: {
  log: MedicationLog;
  onConfirm: (logId: string) => void;
}) {
  return (
    <View style={[styles.medItem, log.confirmed && styles.medItemConfirmed]}>
      <View
        style={[
          styles.medIcon,
          { backgroundColor: log.confirmed ? "#E8F5E9" : "#FFF3E0" },
        ]}
      >
        <Ionicons
          name={log.confirmed ? "checkmark-circle" : "medical"}
          size={20}
          color={log.confirmed ? COLORS.success : COLORS.warning}
        />
      </View>
      <View style={styles.medInfo}>
        <Text style={[styles.medName, log.confirmed && styles.medNameDone]}>
          {log.medications?.name ?? "-"}
        </Text>
        <Text style={styles.medDetail}>
          {log.medications?.dose ?? "-"} · {formatScheduleLabel(log.schedule)} ·{" "}
          {log.patients?.name ?? "-"}
        </Text>
      </View>
      {!log.confirmed ? (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm(log.id)}
        >
          <Text style={styles.confirmBtnText}>Sudah</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedBadgeText}>✓</Text>
        </View>
      )}
    </View>
  );
}

// ─── Komponen: Kartu Jadwal Cek-up ───────────────────────────────────────────
function AppointmentCard({ appt }: { appt: Appointment }) {
  const daysLeft = getDaysLeft(appt.scheduled_date);
  const urgentColor = daysLeft <= 3 ? COLORS.danger : COLORS.primary;

  return (
    <TouchableOpacity style={styles.apptCard} activeOpacity={0.85}>
      <View style={[styles.apptDateBadge, { backgroundColor: urgentColor }]}>
        <Text style={styles.apptDaysNum}>{daysLeft}</Text>
        <Text style={styles.apptDaysLabel}>hari</Text>
      </View>
      <View style={styles.apptInfo}>
        <Text style={styles.apptPatient}>{appt.patients?.name ?? "-"}</Text>
        <Text style={styles.apptDoctor}>{appt.doctor_name}</Text>
        <Text style={styles.apptHospital}>
          <Ionicons
            name="location-outline"
            size={11}
            color={COLORS.textMuted}
          />{" "}
          {appt.hospital_name}
        </Text>
        <View style={styles.apptTypeBadge}>
          <Text style={styles.apptTypeText}>
            {formatAppointmentType(appt.appointment_type)}
          </Text>
        </View>
      </View>
      <View style={styles.apptDate}>
        <Text style={styles.apptDateText}>
          {formatAppointmentDate(appt.scheduled_date)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Komponen: Quick Actions ──────────────────────────────────────────────────
// function QuickActions() {
//   const actions = [
//     {
//       icon: "medical-outline",
//       label: "Tambah\nObat",
//       color: "#E8F5F0",
//       iconColor: COLORS.primary,
//       route: "/(app)/medications/add",
//     },
//     {
//       icon: "calendar-outline",
//       label: "Jadwal\nCek-up",
//       color: "#FFF3E0",
//       iconColor: COLORS.warning,
//       route: "/(app)/appointments/add",
//     },
//     {
//       icon: "people-outline",
//       label: "Undang\nKeluarga",
//       color: "#EDE7F6",
//       iconColor: "#7B68EE",
//       route: "/(app)/family/invite",
//     },
//     {
//       icon: "stats-chart-outline",
//       label: "Riwayat\nObat",
//       color: "#E3F2FD",
//       iconColor: "#2196F3",
//       route: "/(app)/medications/history",
//     },
//   ];

//   return (
//     <View style={styles.quickActionsRow}>
//       {actions.map((a) => (
//         <TouchableOpacity
//           key={a.label}
//           style={styles.quickActionItem}
//           activeOpacity={0.8}
//           onPress={() => router.push(a.route as any)}
//         >
//           <View style={[styles.quickActionIcon, { backgroundColor: a.color }]}>
//             <Ionicons name={a.icon as any} size={22} color={a.iconColor} />
//           </View>
//           <Text style={styles.quickActionLabel}>{a.label}</Text>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );
// }

// ─── Layar Utama ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { profile, loading: profileLoading } = useProfile();
  const {
    patients,
    medLogs,
    appointments,
    loading: dataLoading,
    refreshing,
    refetch,
  } = useDashboardData(profile?.family_id);

  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  useEffect(() => {
    if (patients.length > 0 && !activePatientId) {
      setActivePatientId(patients[0].id);
    }
  }, [patients]);

  const activeMedLogs = activePatientId
    ? medLogs.filter((l) => l.patient_id === activePatientId)
    : [];
  const confirmedCount = activeMedLogs.filter((l) => l.confirmed).length;

  async function handleConfirm(logId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await supabase
      .from("medication_logs")
      .update({
        confirmed: true,
        confirmed_by: userId ?? null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", logId);

    if (!error) refetch();
  }

  const isLoading = profileLoading || dataLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Header */}
          <DashboardHeader profile={profile} />

          {/* Quick Actions */}
          {/* <View style={styles.section}>
            <QuickActions />
          </View> */}

          {/* Pasien — section tanpa paddingHorizontal agar ScrollView full width */}
          <View style={styles.sectionNoHpad}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={styles.sectionTitle}>Orang yang Dirawat</Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/patients/add" as any)}
              >
                <Text style={styles.sectionLink}>+ Tambah</Text>
              </TouchableOpacity>
            </View>

            {patients.length === 0 ? (
              <View style={[styles.card, { marginHorizontal: 20 }]}>
                <Text style={styles.emptyText}>
                  Belum ada pasien. Tap "+ Tambah" untuk menambahkan.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.patientScrollContent}
              >
                <View style={styles.patientList}>
                  {patients.map((p, i) => (
                    <PatientCard
                      key={p.id}
                      patient={p}
                      index={i}
                      isActive={activePatientId === p.id}
                      onPress={() => setActivePatientId(p.id)}
                      medLogs={medLogs}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Obat Hari Ini */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Obat Hari Ini</Text>
              <Text style={styles.sectionMeta}>
                {confirmedCount}/{activeMedLogs.length} sudah diminum
              </Text>
            </View>

            <View style={styles.complianceBar}>
              <View
                style={[
                  styles.complianceBarFill,
                  {
                    width:
                      activeMedLogs.length > 0
                        ? (`${(confirmedCount / activeMedLogs.length) * 100}%` as any)
                        : "0%",
                  },
                ]}
              />
            </View>

            <View style={styles.card}>
              {activeMedLogs.length === 0 ? (
                <Text style={styles.emptyText}>
                  {patients.length === 0
                    ? "Tambah pasien dulu untuk melihat jadwal obat."
                    : "Tidak ada jadwal obat hari ini."}
                </Text>
              ) : (
                activeMedLogs.map((log) => (
                  <MedicationItem
                    key={log.id}
                    log={log}
                    onConfirm={handleConfirm}
                  />
                ))
              )}
            </View>
          </View>

          {/* Jadwal Cek-up */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Jadwal Cek-up</Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/appointments" as any)}
              >
                <Text style={styles.sectionLink}>Semua</Text>
              </TouchableOpacity>
            </View>

            {appointments.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  Tidak ada jadwal cek-up mendatang.
                </Text>
              </View>
            ) : (
              appointments.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} />
              ))
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Style ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerGreeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  headerName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionNoHpad: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  sectionMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  emptyText: {
    padding: 20,
    color: COLORS.textMuted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 15,
  },

  // Patient Cards
  patientScrollContent: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  patientList: {
    flexDirection: "row",
    gap: 12,
  },
  patientCard: {
    width: 260,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  patientCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0FAF5",
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  patientAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  patientInfo: {
    flex: 1,
  },
  patientMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  patientTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  },
  conditionTag: {
    backgroundColor: "#E8F5F0",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  conditionTagText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },
  careScoreBox: {
    alignItems: "center",
    minWidth: 60,
  },
  careScoreNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  careScoreLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 1,
  },
  careScoreBar: {
    width: 50,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  careScoreBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Compliance bar
  complianceBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  complianceBarFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },

  // Medication
  medItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  medItemConfirmed: {
    opacity: 0.6,
  },
  medIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  medNameDone: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  medDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  confirmedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmedBadgeText: {
    color: COLORS.success,
    fontWeight: "700",
    fontSize: 14,
  },

  // Appointment
  apptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  apptDateBadge: {
    width: 48,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  apptDaysNum: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    lineHeight: 22,
  },
  apptDaysLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "500",
  },
  apptInfo: {
    flex: 1,
    gap: 2,
  },
  apptPatient: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  apptDoctor: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  apptHospital: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  apptTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  apptTypeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },
  apptDate: {
    alignItems: "flex-end",
    gap: 4,
  },
  apptDateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "right",
    maxWidth: 80,
  },
});
