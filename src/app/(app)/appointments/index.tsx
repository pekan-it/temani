import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const PRIMARY = "#2D6A4F";
const PRIMARY_LIGHT = "#E8F5F0";
const BG = "#F8FAF9";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#A0B5AC";
const BORDER = "#E8F0ED";
const PURPLE = "#8B5CF6";
const ORANGE = "#F59E0B";

type Appointment = {
  id: string;
  patient_id: string;
  family_id: string;
  hospital_name: string;
  doctor_name: string;
  appointment_type: "kontrol_rutin" | "ambil_resep" | "cek_lab" | "lainnya";
  scheduled_date: string; // "YYYY-MM-DD"
  scheduled_time: string; // "HH:MM:SS"
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  result_notes: string | null;
  created_at: string;
  patients: {
    name: string;
    notes: string | null;
  } | null;
};

type TabType = "upcoming" | "past";

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  kontrol_rutin: "Kontrol Rutin",
  ambil_resep: "Ambil Resep",
  cek_lab: "Cek Lab",
  lainnya: "Lainnya",
};

const APPOINTMENT_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  kontrol_rutin: { color: PRIMARY, bg: PRIMARY_LIGHT },
  ambil_resep: { color: "#3B82F6", bg: "#EFF6FF" },
  cek_lab: { color: ORANGE, bg: "#FFFBEB" },
  lainnya: { color: TEXT_MUTED, bg: "#F1F5F3" },
};

export default function AppointmentListScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, []),
  );

  async function fetchAppointments() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.family_id)
        throw new Error("Anda belum tergabung dalam keluarga");

      // appointments punya family_id langsung → filter langsung, join patients untuk nama
      const { data, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patients!patient_id (
            name,
            notes
          )
        `,
        )
        .eq("family_id", profile.family_id)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (apptError) throw apptError;
      setAppointments((data as Appointment[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getApptDate(appt: Appointment) {
    // scheduled_date: "YYYY-MM-DD", scheduled_time: "HH:MM:SS"
    return new Date(`${appt.scheduled_date}T${appt.scheduled_time}`);
  }

  const upcomingList = appointments.filter(
    (a) => a.status === "scheduled" && getApptDate(a) >= today,
  );

  const pastList = appointments
    .filter((a) => a.status !== "scheduled" || getApptDate(a) < today)
    .sort((a, b) => getApptDate(b).getTime() - getApptDate(a).getTime());

  const displayList = activeTab === "upcoming" ? upcomingList : pastList;

  function getStatus(appt: Appointment): {
    label: string;
    color: string;
    bg: string;
  } {
    if (appt.status === "completed")
      return { label: "Selesai", color: PRIMARY, bg: PRIMARY_LIGHT };
    if (appt.status === "cancelled")
      return { label: "Dibatalkan", color: "#EF4444", bg: "#FEF2F2" };
    if (getApptDate(appt) < today)
      return { label: "Terlewat", color: ORANGE, bg: "#FFFBEB" };
    return { label: "Akan Datang", color: PURPLE, bg: "#F5F3FF" };
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTime(timeStr: string) {
    // timeStr: "HH:MM:SS"
    const [h, m] = timeStr.split(":");
    return `${h}:${m}`;
  }

  function getDaysUntil(appt: Appointment) {
    const apptDate = new Date(appt.scheduled_date + "T00:00:00");
    apptDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Besok";
    if (diff < 0) return null;
    return `${diff} hari lagi`;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Memuat jadwal cek-up...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Gagal memuat data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAppointments}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Jadwal Cek-up</Text>
          <Text style={styles.headerSub}>
            {upcomingList.length} jadwal akan datang
          </Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Ionicons name="calendar" size={20} color={PRIMARY} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["upcoming", "past"] as TabType[]).map((tab) => {
          const count =
            tab === "upcoming" ? upcomingList.length : pastList.length;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab === "upcoming" ? "Akan Datang" : "Riwayat"}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    isActive ? styles.tabBadgeActive : styles.tabBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      isActive && styles.tabBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {displayList.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={56} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>
              {activeTab === "upcoming"
                ? "Tidak ada jadwal cek-up"
                : "Belum ada riwayat cek-up"}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === "upcoming"
                ? "Tambahkan jadwal pemeriksaan untuk pasien"
                : "Riwayat kunjungan akan muncul di sini"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const status = getStatus(item);
              const daysUntil =
                activeTab === "upcoming" ? getDaysUntil(item) : null;
              const day = new Date(item.scheduled_date + "T00:00:00").getDate();
              const month = new Date(
                item.scheduled_date + "T00:00:00",
              ).toLocaleDateString("id-ID", { month: "short" });
              const typeStyle =
                APPOINTMENT_TYPE_COLOR[item.appointment_type] ??
                APPOINTMENT_TYPE_COLOR.lainnya;
              const typeLabel =
                APPOINTMENT_TYPE_LABEL[item.appointment_type] ?? "Lainnya";

              return (
                <View style={styles.card}>
                  {/* Date strip */}
                  <View
                    style={[
                      styles.dateStrip,
                      {
                        backgroundColor:
                          activeTab === "past" ? "#F3F4F6" : "#F5F3FF",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateDay,
                        { color: activeTab === "past" ? TEXT_MUTED : PURPLE },
                      ]}
                    >
                      {day}
                    </Text>
                    <Text
                      style={[
                        styles.dateMonth,
                        { color: activeTab === "past" ? TEXT_MUTED : PURPLE },
                      ]}
                    >
                      {month.toUpperCase()}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    {/* Patient chip + status */}
                    <View style={styles.cardTopRow}>
                      {item.patients?.name ? (
                        <View style={styles.patientChip}>
                          <Ionicons
                            name="person-outline"
                            size={10}
                            color={PRIMARY}
                          />
                          <Text style={styles.patientChipText}>
                            {item.patients.name}
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: status.bg },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: status.color }]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    {/* Doctor + hospital */}
                    <Text style={styles.doctorName}>{item.doctor_name}</Text>
                    <View style={styles.hospitalRow}>
                      <Ionicons
                        name="business-outline"
                        size={12}
                        color={TEXT_MUTED}
                      />
                      <Text style={styles.hospitalText}>
                        {item.hospital_name}
                      </Text>
                    </View>

                    {/* Type chip + time row */}
                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.typeChip,
                          { backgroundColor: typeStyle.bg },
                        ]}
                      >
                        <Text
                          style={[styles.typeText, { color: typeStyle.color }]}
                        >
                          {typeLabel}
                        </Text>
                      </View>
                      <View style={styles.dot} />
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={TEXT_MUTED}
                      />
                      <Text style={styles.metaText}>
                        {formatTime(item.scheduled_time)}
                      </Text>
                      <View style={styles.dot} />
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={TEXT_MUTED}
                      />
                      <Text style={styles.metaText}>
                        {formatDate(item.scheduled_date)}
                      </Text>
                    </View>

                    {/* Notes */}
                    {item.notes ? (
                      <View style={styles.notesBox}>
                        <Ionicons
                          name="document-text-outline"
                          size={12}
                          color={TEXT_MUTED}
                        />
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Result notes (riwayat) */}
                    {item.result_notes ? (
                      <View
                        style={[
                          styles.notesBox,
                          {
                            backgroundColor: PRIMARY_LIGHT,
                            borderColor: "#C6E6D8",
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={12}
                          color={PRIMARY}
                        />
                        <Text style={[styles.notesText, { color: PRIMARY }]}>
                          {item.result_notes}
                        </Text>
                      </View>
                    ) : null}

                    {/* Countdown pill */}
                    {daysUntil ? (
                      <View style={styles.countdownPill}>
                        <Ionicons
                          name="hourglass-outline"
                          size={11}
                          color={PURPLE}
                        />
                        <Text style={styles.countdownText}>{daysUntil}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(app)/appointments/add")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Tambah Jadwal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD_BG,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: TEXT_DARK },
  headerSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F3",
  },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBadgeInactive: { backgroundColor: BORDER },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: TEXT_MUTED },
  tabBadgeTextActive: { color: "#fff" },

  listContent: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateStrip: {
    width: 46,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  dateMonth: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },

  cardContent: { flex: 1, gap: 4 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  patientChipText: { fontSize: 11, fontWeight: "600", color: PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },

  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  hospitalRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hospitalText: { fontSize: 12, color: TEXT_MUTED },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: { fontSize: 11, fontWeight: "600" },
  metaText: { fontSize: 12, color: TEXT_MUTED },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEXT_MUTED,
    marginHorizontal: 1,
  },

  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 4,
    backgroundColor: "#F8FAF9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notesText: { fontSize: 12, color: TEXT_MUTED, flex: 1, lineHeight: 16 },

  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  countdownText: { fontSize: 11, fontWeight: "700", color: PURPLE },

  emptyTitle: { fontSize: 16, fontWeight: "600", color: TEXT_DARK },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },

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

  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
