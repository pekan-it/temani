import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Tipe data lokal ─────────────────────────────────────────────────────────
type Patient = {
  id: string;
  name: string;
  relation: string;
  careScore: number;
  conditions: string[];
  avatarColor: string;
};

type Medication = {
  id: string;
  patientId: string;
  name: string;
  time: string;
  confirmed: boolean;
  dose: string;
};

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  hospital: string;
  type: string;
  date: string;
  daysLeft: number;
};

// ─── Data dummy (nanti diganti dengan Supabase realtime) ──────────────────────
const DUMMY_PATIENTS: Patient[] = [
  {
    id: "1",
    name: "Bapak Hendra",
    relation: "Ayah",
    careScore: 82,
    conditions: ["Diabetes", "Hipertensi"],
    avatarColor: "#4A90A4",
  },
  {
    id: "2",
    name: "Ibu Sari",
    relation: "Ibu",
    careScore: 65,
    conditions: ["Asma"],
    avatarColor: "#7B68EE",
  },
];

const DUMMY_MEDICATIONS: Medication[] = [
  {
    id: "m1",
    patientId: "1",
    name: "Metformin 500mg",
    time: "07:00",
    confirmed: true,
    dose: "1 tablet",
  },
  {
    id: "m2",
    patientId: "1",
    name: "Amlodipine 5mg",
    time: "08:00",
    confirmed: false,
    dose: "1 tablet",
  },
  {
    id: "m3",
    patientId: "2",
    name: "Salbutamol",
    time: "09:00",
    confirmed: false,
    dose: "2 puff",
  },
];

const DUMMY_APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    patientId: "1",
    patientName: "Bapak Hendra",
    doctorName: "dr. Budi Santoso, Sp.PD",
    hospital: "RS Panti Waluya",
    type: "Kontrol Rutin",
    date: "Rabu, 25 Jun 2025",
    daysLeft: 4,
  },
  {
    id: "a2",
    patientId: "2",
    patientName: "Ibu Sari",
    doctorName: "dr. Rina Hartati, Sp.P",
    hospital: "Klinik Sehat Bersama",
    type: "Ambil Resep",
    date: "Jumat, 27 Jun 2025",
    daysLeft: 6,
  },
];

// ─── Warna tema ───────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#2D6A4F", // hijau tua — kepercayaan, kesehatan
  primaryLight: "#52B788", // hijau muda
  accent: "#F4A261", // oranye hangat — kehangatan keluarga
  surface: "#F8FAF9", // latar bersih
  card: "#FFFFFF",
  textPrimary: "#1B2D27",
  textSecondary: "#6B8F7E",
  textMuted: "#A0B5AC",
  danger: "#E76F51",
  success: "#52B788",
  warning: "#F4A261",
  border: "#E8F0ED",
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function getCareScoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.danger;
}

function getCareScoreLabel(score: number): string {
  if (score >= 80) return "Sangat Baik";
  if (score >= 60) return "Cukup Baik";
  return "Perlu Perhatian";
}

// ─── Komponen: Header ─────────────────────────────────────────────────────────
function DashboardHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerGreeting}>Selamat pagi,</Text>
        <Text style={styles.headerName}>Tian 👋</Text>
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
          <Text style={styles.avatarText}>T</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Komponen: Kartu Pasien ───────────────────────────────────────────────────
function PatientCard({
  patient,
  isActive,
  onPress,
}: {
  patient: Patient;
  isActive: boolean;
  onPress: () => void;
}) {
  const scoreColor = getCareScoreColor(patient.careScore);
  const scoreLabel = getCareScoreLabel(patient.careScore);

  return (
    <TouchableOpacity
      style={[styles.patientCard, isActive && styles.patientCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View
        style={[styles.patientAvatar, { backgroundColor: patient.avatarColor }]}
      >
        <Text style={styles.patientAvatarText}>{patient.name.charAt(0)}</Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientRelation}>{patient.relation}</Text>
        <Text style={styles.patientName}>{patient.name}</Text>
        <View style={styles.patientTags}>
          {patient.conditions.map((c) => (
            <View key={c} style={styles.conditionTag}>
              <Text style={styles.conditionTagText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Care Score */}
      <View style={styles.careScoreBox}>
        <Text style={[styles.careScoreNum, { color: scoreColor }]}>
          {patient.careScore}
        </Text>
        <Text style={styles.careScoreLabel}>{scoreLabel}</Text>
        {/* Mini bar */}
        <View style={styles.careScoreBar}>
          <View
            style={[
              styles.careScoreBarFill,
              {
                width: `${patient.careScore}%` as any,
                backgroundColor: scoreColor,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Komponen: Obat Hari Ini ──────────────────────────────────────────────────
function MedicationItem({
  med,
  onConfirm,
}: {
  med: Medication;
  onConfirm: (id: string) => void;
}) {
  return (
    <View style={[styles.medItem, med.confirmed && styles.medItemConfirmed]}>
      <View
        style={[
          styles.medIcon,
          { backgroundColor: med.confirmed ? "#E8F5E9" : "#FFF3E0" },
        ]}
      >
        <Ionicons
          name={med.confirmed ? "checkmark-circle" : "medical"}
          size={20}
          color={med.confirmed ? COLORS.success : COLORS.warning}
        />
      </View>
      <View style={styles.medInfo}>
        <Text style={[styles.medName, med.confirmed && styles.medNameDone]}>
          {med.name}
        </Text>
        <Text style={styles.medDetail}>
          {med.dose} · {med.time}
        </Text>
      </View>
      {!med.confirmed && (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm(med.id)}
        >
          <Text style={styles.confirmBtnText}>Sudah</Text>
        </TouchableOpacity>
      )}
      {med.confirmed && (
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedBadgeText}>✓</Text>
        </View>
      )}
    </View>
  );
}

// ─── Komponen: Jadwal Cek-up ──────────────────────────────────────────────────
function AppointmentCard({ appt }: { appt: Appointment }) {
  const urgentColor = appt.daysLeft <= 3 ? COLORS.danger : COLORS.primary;

  return (
    <TouchableOpacity style={styles.apptCard} activeOpacity={0.85}>
      <View style={[styles.apptDateBadge, { backgroundColor: urgentColor }]}>
        <Text style={styles.apptDaysNum}>{appt.daysLeft}</Text>
        <Text style={styles.apptDaysLabel}>hari</Text>
      </View>
      <View style={styles.apptInfo}>
        <Text style={styles.apptPatient}>{appt.patientName}</Text>
        <Text style={styles.apptDoctor}>{appt.doctorName}</Text>
        <Text style={styles.apptHospital}>
          <Ionicons
            name="location-outline"
            size={11}
            color={COLORS.textMuted}
          />{" "}
          {appt.hospital}
        </Text>
        <View style={[styles.apptTypeBadge]}>
          <Text style={styles.apptTypeText}>{appt.type}</Text>
        </View>
      </View>
      <View style={styles.apptDate}>
        <Text style={styles.apptDateText}>{appt.date}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Komponen: Quick Action ───────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    {
      icon: "medical-outline",
      label: "Tambah\nObat",
      color: "#E8F5F0",
      iconColor: COLORS.primary,
    },
    {
      icon: "calendar-outline",
      label: "Jadwal\nCek-up",
      color: "#FFF3E0",
      iconColor: COLORS.warning,
    },
    {
      icon: "people-outline",
      label: "Undang\nKeluarga",
      color: "#EDE7F6",
      iconColor: "#7B68EE",
    },
    {
      icon: "stats-chart-outline",
      label: "Care\nScore",
      color: "#E3F2FD",
      iconColor: "#2196F3",
    },
  ];

  return (
    <View style={styles.quickActionsRow}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          style={styles.quickActionItem}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: a.color }]}>
            <Ionicons name={a.icon as any} size={22} color={a.iconColor} />
          </View>
          <Text style={styles.quickActionLabel}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Layar Utama ─────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [activePatientId, setActivePatientId] = useState<string>("1");
  const [medications, setMedications] =
    useState<Medication[]>(DUMMY_MEDICATIONS);

  const activeMeds = medications.filter((m) => m.patientId === activePatientId);
  const confirmedCount = activeMeds.filter((m) => m.confirmed).length;

  function handleConfirm(medId: string) {
    setMedications((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, confirmed: true } : m)),
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Quick Actions */}
        <View style={styles.section}>
          <QuickActions />
        </View>

        {/* Pasien yang Dirawat */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Orang yang Dirawat</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>+ Tambah</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.patientList}>
              {DUMMY_PATIENTS.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  isActive={activePatientId === p.id}
                  onPress={() => setActivePatientId(p.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Obat Hari Ini */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Obat Hari Ini</Text>
            <Text style={styles.sectionMeta}>
              {confirmedCount}/{activeMeds.length} sudah diminum
            </Text>
          </View>

          {/* Progress bar kepatuhan */}
          <View style={styles.complianceBar}>
            <View
              style={[
                styles.complianceBarFill,
                {
                  width: activeMeds.length
                    ? (`${(confirmedCount / activeMeds.length) * 100}%` as any)
                    : "0%",
                },
              ]}
            />
          </View>

          <View style={styles.card}>
            {activeMeds.length === 0 ? (
              <Text style={styles.emptyText}>
                Belum ada jadwal obat. Tap "+ Tambah Obat" di atas.
              </Text>
            ) : (
              activeMeds.map((med) => (
                <MedicationItem
                  key={med.id}
                  med={med}
                  onConfirm={handleConfirm}
                />
              ))
            )}
          </View>
        </View>

        {/* Jadwal Cek-up Mendatang */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Jadwal Cek-up</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Semua</Text>
            </TouchableOpacity>
          </View>
          {DUMMY_APPOINTMENTS.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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

  // Card wrapper
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

  // Patient Card
  patientList: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
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
  patientRelation: {
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
