import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  name: string;
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
  patient?: Patient;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCHEDULE_LABEL: Record<string, string> = {
  pagi: "Pagi",
  siang: "Siang",
  malam: "Malam",
  sebelum_tidur: "Sebelum Tidur",
};

const SCHEDULE_COLOR: Record<string, string> = {
  pagi: "#FFF3CD",
  siang: "#D4EDDA",
  malam: "#CCE5FF",
  sebelum_tidur: "#E2D9F3",
};

const SCHEDULE_TEXT_COLOR: Record<string, string> = {
  pagi: "#856404",
  siang: "#155724",
  malam: "#004085",
  sebelum_tidur: "#4B2991",
};

function StockBadge({ stock }: { stock: number }) {
  const low = stock <= 5;
  return (
    <View style={[styles.stockBadge, low ? styles.stockLow : styles.stockOk]}>
      <Ionicons
        name={low ? "warning-outline" : "cube-outline"}
        size={12}
        color={low ? "#B45309" : "#065F46"}
      />
      <Text
        style={[
          styles.stockText,
          low ? styles.stockTextLow : styles.stockTextOk,
        ]}
      >
        {stock} tablet
      </Text>
    </View>
  );
}

function MedicationCard({
  item,
  onPress,
}: {
  item: Medication;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="medical" size={20} color="#2D6A4F" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.medName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.medDose}>{item.dose}</Text>
        </View>
        {!item.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Nonaktif</Text>
          </View>
        )}
      </View>

      {/* Patient */}
      {item.patient && (
        <View style={styles.patientRow}>
          <Ionicons name="person-outline" size={13} color="#6B8F7E" />
          <Text style={styles.patientName}>{item.patient.name}</Text>
        </View>
      )}

      {/* Schedules */}
      <View style={styles.scheduleRow}>
        {item.schedules.map((s) => (
          <View
            key={s}
            style={[
              styles.scheduleChip,
              { backgroundColor: SCHEDULE_COLOR[s] ?? "#F3F4F6" },
            ]}
          >
            <Text
              style={[
                styles.scheduleChipText,
                { color: SCHEDULE_TEXT_COLOR[s] ?? "#374151" },
              ]}
            >
              {SCHEDULE_LABEL[s] ?? s}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <StockBadge stock={item.stock} />
        {item.expiry_date && (
          <Text style={styles.expiry}>
            Exp: {new Date(item.expiry_date).toLocaleDateString("id-ID")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Patient Picker Modal ─────────────────────────────────────────────────────

function PatientPickerModal({
  visible,
  patients,
  loading,
  onSelect,
  onClose,
}: {
  visible: boolean;
  patients: Patient[];
  loading: boolean;
  onSelect: (patientId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Pilih Pasien</Text>
          <Text style={styles.modalSub}>
            Obat akan ditambahkan untuk pasien yang dipilih
          </Text>

          {loading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="small" color="#2D6A4F" />
              <Text style={styles.modalLoadingText}>Memuat pasien...</Text>
            </View>
          ) : patients.length === 0 ? (
            <View style={styles.modalCenter}>
              <Ionicons name="people-outline" size={40} color="#C5D9D1" />
              <Text style={styles.modalEmptyText}>
                Belum ada pasien terdaftar
              </Text>
            </View>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(p) => p.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.patientOption}
                  onPress={() => onSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.patientOptionAvatar}>
                    <Ionicons name="person" size={18} color="#2D6A4F" />
                  </View>
                  <Text style={styles.patientOptionName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C5D9D1" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
            <Text style={styles.modalCancelText}>Batal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MedicationListScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Patient picker state
  const [showPicker, setShowPicker] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, []);

  async function fetchMedications() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("medications")
        .select(
          `
          id,
          patient_id,
          name,
          dose,
          schedules,
          stock,
          expiry_date,
          is_active,
          patient:patients(id, name)
        `,
        )
        .order("is_active", { ascending: false })
        .order("name");

      if (sbError) throw sbError;
      setMedications((data as unknown as Medication[]) ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Gagal memuat data obat.");
    } finally {
      setLoading(false);
    }
  }

  async function openPatientPicker() {
    setShowPicker(true);
    setPatientsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();

      if (!profile?.family_id) throw new Error("Family tidak ditemukan");

      const { data, error: sbError } = await supabase
        .from("patients")
        .select("id, name")
        .eq("family_id", profile.family_id)
        .order("name");

      if (sbError) throw sbError;
      setPatients(data ?? []);
    } catch (err: any) {
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  }

  function handleSelectPatient(patientId: string) {
    setShowPicker(false);
    router.push(`/medications/${patientId}/add`);
  }

  const activeMeds = medications.filter((m) => m.is_active);
  const inactiveMeds = medications.filter((m) => !m.is_active);

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>Memuat obat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMedications}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Full list ────────────────────────────────────────────────────────────

  type Section =
    | { type: "header"; label: string; count: number }
    | { type: "item"; data: Medication }
    | { type: "empty"; label: string };

  const listData: Section[] = [];

  if (activeMeds.length > 0) {
    listData.push({ type: "header", label: "Aktif", count: activeMeds.length });
    activeMeds.forEach((m) => listData.push({ type: "item", data: m }));
  }

  if (inactiveMeds.length > 0) {
    listData.push({
      type: "header",
      label: "Nonaktif",
      count: inactiveMeds.length,
    });
    inactiveMeds.forEach((m) => listData.push({ type: "item", data: m }));
  }

  if (listData.length === 0) {
    listData.push({ type: "empty", label: "Belum ada obat yang ditambahkan." });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Jadwal Obat</Text>
          <Text style={styles.screenSub}>{activeMeds.length} obat aktif</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openPatientPicker}
          accessibilityLabel="Tambah obat baru"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <FlatList
        data={listData}
        keyExtractor={(item, idx) =>
          item.type === "item" ? item.data.id : `${item.type}-${idx}`
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{item.label}</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{item.count}</Text>
                </View>
              </View>
            );
          }
          if (item.type === "empty") {
            return (
              <View style={styles.emptyWrap}>
                <Ionicons name="medical-outline" size={52} color="#C5D9D1" />
                <Text style={styles.emptyTitle}>Belum ada obat</Text>
                <Text style={styles.emptyDesc}>
                  Tambah obat pertama untuk mulai memantau jadwal minum obat.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={openPatientPicker}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#2D6A4F"
                  />
                  <Text style={styles.emptyAddText}>Tambah Obat</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <MedicationCard
              item={item.data}
              onPress={() => router.push(`/medications/${item.data.id}`)}
            />
          );
        }}
      />

      {/* ── Patient Picker Modal ── */}
      <PatientPickerModal
        visible={showPicker}
        patients={patients}
        loading={patientsLoading}
        onSelect={handleSelectPatient}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F5F2" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 14, color: "#6B8F7E", marginTop: 4 },
  errorText: { fontSize: 15, color: "#DC2626", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#2D6A4F",
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#F0F5F2",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B2D27",
    letterSpacing: -0.3,
  },
  screenSub: { fontSize: 13, color: "#6B8F7E", marginTop: 2 },
  addBtn: {
    backgroundColor: "#2D6A4F",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2D6A4F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A7062",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: {
    backgroundColor: "#C8E6D8",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  sectionCountText: { fontSize: 11, fontWeight: "700", color: "#1B5E3A" },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#1B2D27",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderText: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700", color: "#1B2D27" },
  medDose: { fontSize: 12, color: "#6B8F7E", marginTop: 1 },
  inactiveBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },

  // Patient row
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    marginBottom: 2,
  },
  patientName: { fontSize: 12, color: "#6B8F7E" },

  // Schedules
  scheduleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  scheduleChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  scheduleChipText: { fontSize: 11, fontWeight: "600" },

  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockOk: { backgroundColor: "#D1FAE5" },
  stockLow: { backgroundColor: "#FEF3C7" },
  stockText: { fontSize: 12, fontWeight: "600" },
  stockTextOk: { color: "#065F46" },
  stockTextLow: { color: "#B45309" },
  expiry: { fontSize: 11, color: "#9CA3AF" },

  // Empty
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B2D27",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#6B8F7E",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#2D6A4F",
    borderRadius: 12,
  },
  emptyAddText: { fontSize: 14, fontWeight: "600", color: "#2D6A4F" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: "60%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2D27",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: "#6B8F7E",
    marginBottom: 16,
  },
  modalCenter: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  modalLoadingText: { fontSize: 13, color: "#6B8F7E" },
  modalEmptyText: { fontSize: 14, color: "#6B8F7E", textAlign: "center" },
  modalList: { marginBottom: 12 },
  patientOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  patientOptionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  patientOptionName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1B2D27",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});
