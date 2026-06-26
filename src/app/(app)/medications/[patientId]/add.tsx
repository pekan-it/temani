import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type Patient = { id: string; name: string };

type ScheduleEntry = {
  key: string;
  label: string;
  icon:
    | "sunny-outline"
    | "partly-sunny-outline"
    | "moon-outline"
    | "bed-outline";
  defaultTime: string; // "HH:MM"
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULES: ScheduleEntry[] = [
  { key: "pagi", label: "Pagi", icon: "sunny-outline", defaultTime: "07:00" },
  {
    key: "siang",
    label: "Siang",
    icon: "partly-sunny-outline",
    defaultTime: "12:00",
  },
  { key: "malam", label: "Malam", icon: "moon-outline", defaultTime: "19:00" },
  {
    key: "sebelum_tidur",
    label: "Sebelum Tidur",
    icon: "bed-outline",
    defaultTime: "21:00",
  },
];

// schedule disimpan sebagai "pagi|07:00"
function encodeSchedule(key: string, time: string) {
  return `${key}|${time}`;
}
function decodeSchedule(s: string): { key: string; time: string } {
  const [key, time] = s.split("|");
  return { key, time: time ?? "00:00" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} required={required} />
      {children}
    </View>
  );
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible,
  scheduleLabel,
  time,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  scheduleLabel: string;
  time: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(time);

  useEffect(() => {
    setSelected(time);
  }, [time, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Jam {scheduleLabel}</Text>
          <Text style={styles.modalSub}>
            Pilih jam minum obat untuk waktu ini
          </Text>

          <DateTimePicker
            value={selected}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            is24Hour
            onChange={(_, date) => {
              if (date) setSelected(date);
            }}
          />

          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => onConfirm(selected)}
            >
              <Text style={styles.modalConfirmText}>Konfirmasi</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MedicationAddScreen() {
  const router = useRouter();

  const { patientId: routePatientId } = useLocalSearchParams<{
    patientId: string;
  }>();

  // Form state
  const [patientId, setPatientId] = useState<string>(
    String(routePatientId ?? ""),
  );
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");

  // scheduleMap: key -> time string "HH:MM" (hanya untuk yang aktif)
  const [scheduleMap, setScheduleMap] = useState<Record<string, string>>({});

  const [stock, setStock] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Time picker modal
  const [timePickerKey, setTimePickerKey] = useState<string | null>(null);

  // Async state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    setLoadingPatients(true);
    const { data } = await supabase
      .from("patients")
      .select("id, name")
      .order("name")
      .returns<Patient[]>();

    setPatients(data ?? []);
    if (!routePatientId && data && data.length === 1) {
      setPatientId(data[0].id);
    }
    setLoadingPatients(false);
  }

  const selectedPatient = patients.find((p) => p.id === patientId);

  // Toggle jadwal aktif/nonaktif
  function toggleSchedule(key: string) {
    setScheduleMap((prev) => {
      if (prev[key] !== undefined) {
        // sudah aktif → hapus
        const next = { ...prev };
        delete next[key];
        return next;
      } else {
        // aktifkan dengan default time
        const def =
          SCHEDULES.find((s) => s.key === key)?.defaultTime ?? "07:00";
        return { ...prev, [key]: def };
      }
    });
  }

  // Buka time picker untuk jadwal tertentu
  function openTimePicker(key: string) {
    setTimePickerKey(key);
  }

  function handleTimeConfirm(date: Date) {
    if (!timePickerKey) return;
    const timeStr = dateToTimeString(date);
    setScheduleMap((prev) => ({ ...prev, [timePickerKey]: timeStr }));
    setTimePickerKey(null);
  }

  // Encode semua jadwal aktif ke format "key|HH:MM"
  const encodedSchedules = Object.entries(scheduleMap).map(([k, t]) =>
    encodeSchedule(k, t),
  );

  function validate() {
    if (!patientId) return "Pilih pasien terlebih dahulu.";
    if (!name.trim()) return "Nama obat wajib diisi.";
    if (!dose.trim()) return "Dosis obat wajib diisi.";
    if (encodedSchedules.length === 0)
      return "Pilih minimal satu jadwal minum.";
    if (!stock.trim() || isNaN(Number(stock)) || Number(stock) < 0)
      return "Stok harus berupa angka yang valid.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      Alert.alert("Periksa Form", err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        name: name.trim(),
        dose: dose.trim(),
        schedules: encodedSchedules,
        stock: Number(stock),
        expiry_date: expiryDate ? expiryDate.toISOString().split("T")[0] : null,
        is_active: isActive,
      };

      const { error: sbError } = await supabase
        .from("medications")
        .insert(payload as any);
      if (sbError) throw sbError;
      router.back();
    } catch (e: any) {
      Alert.alert("Gagal Menyimpan", e?.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  // Time picker modal data
  const activeTimePickerSchedule = SCHEDULES.find(
    (s) => s.key === timePickerKey,
  );
  const activeTimePickerDate = timePickerKey
    ? timeStringToDate(scheduleMap[timePickerKey] ?? "07:00")
    : new Date();

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Kembali"
        >
          <Ionicons name="chevron-back" size={22} color="#1B2D27" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tambah Obat</Text>
          {selectedPatient ? (
            <View style={styles.headerPatientBadge}>
              <Ionicons name="person" size={11} color="#2D6A4F" />
              <Text style={styles.headerPatientName}>
                {selectedPatient.name}
              </Text>
            </View>
          ) : loadingPatients ? (
            <ActivityIndicator
              size="small"
              color="#2D6A4F"
              style={{ marginTop: 2 }}
            />
          ) : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Pasien ── */}
          <Field label="Pasien" required>
            {loadingPatients ? (
              <View style={styles.inputSkeleton}>
                <ActivityIndicator size="small" color="#2D6A4F" />
              </View>
            ) : patients.length === 0 ? (
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputPlaceholder}>
                  Belum ada pasien terdaftar
                </Text>
              </View>
            ) : (
              <View style={styles.patientList}>
                {patients.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.patientChip,
                      patientId === p.id && styles.patientChipActive,
                    ]}
                    onPress={() => setPatientId(p.id)}
                  >
                    <Ionicons
                      name="person"
                      size={13}
                      color={patientId === p.id ? "#fff" : "#6B8F7E"}
                    />
                    <Text
                      style={[
                        styles.patientChipText,
                        patientId === p.id && styles.patientChipTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>

          {/* ── Nama Obat ── */}
          <Field label="Nama Obat" required>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Metformin 500mg"
              placeholderTextColor="#A0B5AC"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </Field>

          {/* ── Dosis ── */}
          <Field label="Dosis" required>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 1 tablet, 2x sehari"
              placeholderTextColor="#A0B5AC"
              value={dose}
              onChangeText={setDose}
              returnKeyType="next"
            />
          </Field>

          {/* ── Jadwal + Jam ── */}
          <Field label="Jadwal Minum" required>
            <View style={styles.scheduleList}>
              {SCHEDULES.map((s) => {
                const active = scheduleMap[s.key] !== undefined;
                const time = scheduleMap[s.key];
                return (
                  <View key={s.key} style={styles.scheduleRow}>
                    {/* Toggle chip */}
                    <Pressable
                      style={[
                        styles.scheduleChip,
                        active && styles.scheduleChipActive,
                      ]}
                      onPress={() => toggleSchedule(s.key)}
                    >
                      <Ionicons
                        name={s.icon}
                        size={18}
                        color={active ? "#fff" : "#6B8F7E"}
                      />
                      <Text
                        style={[
                          styles.scheduleChipText,
                          active && styles.scheduleChipTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#fff"
                        />
                      )}
                    </Pressable>

                    {/* Jam picker — hanya tampil kalau aktif */}
                    {active && (
                      <TouchableOpacity
                        style={styles.timeBadge}
                        onPress={() => openTimePicker(s.key)}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#2D6A4F"
                        />
                        <Text style={styles.timeBadgeText}>{time}</Text>
                        <Ionicons
                          name="chevron-down"
                          size={12}
                          color="#2D6A4F"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </Field>

          {/* ── Stok ── */}
          <Field label="Stok Awal (tablet)" required>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 30"
              placeholderTextColor="#A0B5AC"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </Field>

          {/* ── Tanggal Kedaluwarsa ── */}
          <Field label="Tanggal Kedaluwarsa">
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={expiryDate ? "#1B2D27" : "#A0B5AC"}
              />
              <Text
                style={[
                  styles.dateText,
                  !expiryDate && styles.inputPlaceholder,
                ]}
              >
                {expiryDate
                  ? expiryDate.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Pilih tanggal (opsional)"}
              </Text>
              {expiryDate && (
                <TouchableOpacity
                  onPress={() => setExpiryDate(null)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#A0B5AC" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate ?? new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setExpiryDate(date);
                }}
              />
            )}
          </Field>

          {/* ── Status Aktif ── */}
          <Field label="Status Obat">
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleOption,
                  isActive && styles.toggleOptionActive,
                ]}
                onPress={() => setIsActive(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={isActive ? "#fff" : "#6B8F7E"}
                />
                <Text
                  style={[
                    styles.toggleText,
                    isActive && styles.toggleTextActive,
                  ]}
                >
                  Aktif
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleOption,
                  !isActive && styles.toggleOptionInactive,
                ]}
                onPress={() => setIsActive(false)}
              >
                <Ionicons
                  name="pause-circle"
                  size={16}
                  color={!isActive ? "#fff" : "#6B8F7E"}
                />
                <Text
                  style={[
                    styles.toggleText,
                    !isActive && styles.toggleTextActive,
                  ]}
                >
                  Nonaktif
                </Text>
              </Pressable>
            </View>
          </Field>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Simpan Obat</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Time Picker Modal ── */}
      <TimePickerModal
        visible={timePickerKey !== null}
        scheduleLabel={activeTimePickerSchedule?.label ?? ""}
        time={activeTimePickerDate}
        onConfirm={handleTimeConfirm}
        onClose={() => setTimePickerKey(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F5F2" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F0F5F2",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCenter: { alignItems: "center", gap: 3 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1B2D27" },
  headerPatientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  headerPatientName: { fontSize: 11, fontWeight: "600", color: "#2D6A4F" },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Field
  fieldWrap: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A7062",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  required: { color: "#EF4444" },

  // Input
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1B2D27",
    borderWidth: 1.5,
    borderColor: "#E2EDE8",
  },
  inputDisabled: { backgroundColor: "#F9FAFB" },
  inputPlaceholder: { color: "#A0B5AC" },
  inputSkeleton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2EDE8",
  },

  // Patient chips
  patientList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C8E6D8",
    backgroundColor: "#fff",
  },
  patientChipActive: { backgroundColor: "#2D6A4F", borderColor: "#2D6A4F" },
  patientChipText: { fontSize: 13, fontWeight: "600", color: "#4A7062" },
  patientChipTextActive: { color: "#fff" },

  // Schedule list
  scheduleList: { gap: 10 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scheduleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C8E6D8",
    backgroundColor: "#fff",
  },
  scheduleChipActive: { backgroundColor: "#2D6A4F", borderColor: "#2D6A4F" },
  scheduleChipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#4A7062",
  },
  scheduleChipTextActive: { color: "#fff" },

  // Time badge
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#C8E6D8",
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D6A4F",
    letterSpacing: 0.5,
  },

  // Date input
  dateInput: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { flex: 1, fontSize: 15, color: "#1B2D27" },

  // Toggle
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C8E6D8",
    backgroundColor: "#fff",
  },
  toggleOptionActive: { backgroundColor: "#2D6A4F", borderColor: "#2D6A4F" },
  toggleOptionInactive: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#4A7062" },
  toggleTextActive: { color: "#fff" },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2D6A4F",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    shadowColor: "#2D6A4F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
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
  modalSub: { fontSize: 13, color: "#6B8F7E", marginBottom: 8 },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#2D6A4F",
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
