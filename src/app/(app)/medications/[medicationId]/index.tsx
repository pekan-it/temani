import { syncAllReminders } from "@/lib/notifications";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

type Medication = {
  id: string;
  patient_id: string;
  name: string;
  dose: string;
  schedules: string[];
  stock: number;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  patient?: Patient;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULES = [
  { key: "pagi", label: "Pagi", icon: "sunny-outline" as const },
  { key: "siang", label: "Siang", icon: "partly-sunny-outline" as const },
  { key: "malam", label: "Malam", icon: "moon-outline" as const },
  {
    key: "sebelum_tidur",
    label: "Sebelum Tidur",
    icon: "bed-outline" as const,
  },
];

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

const SCHEDULE_LABEL: Record<string, string> = {
  pagi: "Pagi",
  siang: "Siang",
  malam: "Malam",
  sebelum_tidur: "Sebelum Tidur",
};

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

function InfoRow({
  icon,
  label,
  value,
  valueStyle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color="#2D6A4F" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MedicationDetailScreen() {
  const router = useRouter();
  const { medicationId } = useLocalSearchParams<{ medicationId: string }>();
  const id = String(medicationId);

  const [medication, setMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [schedules, setSchedules] = useState<string[]>([]);
  const [stock, setStock] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchMedication();
  }, [id]);

  async function fetchMedication() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("medications")
        .select(
          `
          id, patient_id, name, dose, schedules,
          stock, expiry_date, is_active, created_at,
          patient:patients(id, name)
        `,
        )
        .eq("id", id)
        .single<Medication>();

      if (sbError) throw sbError;
      if (!data) throw new Error("Data obat tidak ditemukan.");

      setMedication(data);
      populateForm(data);
    } catch (err: any) {
      setError(err?.message ?? "Gagal memuat detail obat.");
    } finally {
      setLoading(false);
    }
  }

  function populateForm(med: Medication) {
    setName(med.name);
    setDose(med.dose);
    setSchedules(med.schedules);
    setStock(String(med.stock));
    setExpiryDate(med.expiry_date ? new Date(med.expiry_date) : null);
    setIsActive(med.is_active);
  }

  function handleEditPress() {
    if (medication) populateForm(medication);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (medication) populateForm(medication);
    setIsEditing(false);
  }

  function toggleSchedule(key: string) {
    setSchedules((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  function validate() {
    if (!name.trim()) return "Nama obat wajib diisi.";
    if (!dose.trim()) return "Dosis obat wajib diisi.";
    if (schedules.length === 0) return "Pilih minimal satu jadwal minum.";
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
        name: name.trim(),
        dose: dose.trim(),
        schedules,
        stock: Number(stock),
        expiry_date: expiryDate ? expiryDate.toISOString().split("T")[0] : null,
        is_active: isActive,
      };

      const { error: sbError } = await supabase
        .from("medications")
        .update(payload as any)
        .eq("id", id);

      if (sbError) throw sbError;

      await syncAllReminders().catch(() => {});
      await fetchMedication();
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert("Gagal Menyimpan", e?.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Hapus Obat",
      `Yakin ingin menghapus "${medication?.name}"? Semua log terkait juga akan terpengaruh.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { error: sbError } = await supabase
                .from("medications")
                .delete()
                .eq("id", id);
              if (sbError) throw sbError;
              await syncAllReminders().catch(() => {});
              router.back();
            } catch (e: any) {
              Alert.alert(
                "Gagal Menghapus",
                e?.message ?? "Terjadi kesalahan.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>Memuat detail obat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !medication) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>
            {error ?? "Data tidak ditemukan."}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMedication}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Edit Mode ────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancelEdit}
            style={styles.backBtn}
            accessibilityLabel="Batal Edit"
          >
            <Ionicons name="close" size={20} color="#1B2D27" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Obat</Text>
            {medication.patient && (
              <View style={styles.headerPatientBadge}>
                <Ionicons name="person" size={11} color="#2D6A4F" />
                <Text style={styles.headerPatientName}>
                  {medication.patient.name}
                </Text>
              </View>
            )}
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
            {/* Nama Obat */}
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

            {/* Dosis */}
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

            {/* Jadwal */}
            <Field label="Jadwal Minum" required>
              <View style={styles.scheduleGrid}>
                {SCHEDULES.map((s) => {
                  const active = schedules.includes(s.key);
                  return (
                    <Pressable
                      key={s.key}
                      style={[
                        styles.scheduleCard,
                        active && styles.scheduleCardActive,
                      ]}
                      onPress={() => toggleSchedule(s.key)}
                    >
                      <Ionicons
                        name={s.icon}
                        size={20}
                        color={active ? "#fff" : "#6B8F7E"}
                      />
                      <Text
                        style={[
                          styles.scheduleCardText,
                          active && styles.scheduleCardTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#fff"
                          style={styles.scheduleCheck}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            {/* Stok */}
            <Field label="Stok (tablet)" required>
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

            {/* Tanggal Kedaluwarsa */}
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

            {/* Status */}
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

            {/* Save */}
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
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.saveBtnDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Hapus Obat</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Detail Mode ──────────────────────────────────────────────────────────

  const stockLow = medication.stock <= 5;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Kembali"
        >
          <Ionicons name="chevron-back" size={22} color="#1B2D27" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Detail Obat
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={handleEditPress}
          accessibilityLabel="Edit obat"
        >
          <Ionicons name="create-outline" size={18} color="#2D6A4F" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="medical" size={32} color="#2D6A4F" />
          </View>
          <Text style={styles.heroName}>{medication.name}</Text>
          <Text style={styles.heroDose}>{medication.dose}</Text>
          <View style={styles.heroStatusRow}>
            <View
              style={[
                styles.statusBadge,
                medication.is_active
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >
              <Ionicons
                name={
                  medication.is_active ? "checkmark-circle" : "pause-circle"
                }
                size={13}
                color={medication.is_active ? "#065F46" : "#6B7280"}
              />
              <Text
                style={[
                  styles.statusText,
                  medication.is_active
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {medication.is_active ? "Aktif" : "Nonaktif"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Jadwal ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jadwal Minum</Text>
          <View style={styles.scheduleRow}>
            {medication.schedules.map((s) => (
              <View
                key={s}
                style={[
                  styles.scheduleChip,
                  { backgroundColor: SCHEDULE_COLOR[s] ?? "#F3F4F6" },
                ]}
              >
                <Ionicons
                  name={
                    SCHEDULES.find((x) => x.key === s)?.icon ?? "time-outline"
                  }
                  size={13}
                  color={SCHEDULE_TEXT_COLOR[s] ?? "#374151"}
                />
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
        </View>

        {/* ── Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Obat</Text>
          <View style={styles.infoCard}>
            {medication.patient && (
              <InfoRow
                icon="person-outline"
                label="Pasien"
                value={medication.patient.name}
              />
            )}
            <View style={styles.infoDivider} />
            <InfoRow
              icon="cube-outline"
              label="Stok Tersisa"
              value={`${medication.stock} tablet`}
              valueStyle={stockLow ? styles.stockLowText : undefined}
            />
            {stockLow && (
              <View style={styles.stockWarning}>
                <Ionicons name="warning-outline" size={14} color="#B45309" />
                <Text style={styles.stockWarningText}>
                  Stok hampir habis, segera tambah stok.
                </Text>
              </View>
            )}
            <View style={styles.infoDivider} />
            <InfoRow
              icon="calendar-outline"
              label="Tanggal Kedaluwarsa"
              value={
                medication.expiry_date
                  ? new Date(medication.expiry_date).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )
                  : "Tidak diatur"
              }
            />
            <View style={styles.infoDivider} />
            <InfoRow
              icon="time-outline"
              label="Ditambahkan"
              value={new Date(medication.created_at).toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            />
          </View>
        </View>

        {/* ── Edit Button ── */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleEditPress}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Edit Obat</Text>
        </TouchableOpacity>

        {/* ── Delete Button ── */}
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.saveBtnDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Hapus Obat</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 8 },
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

  // Hero
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1B2D27",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B2D27",
    textAlign: "center",
    marginBottom: 4,
  },
  heroDose: {
    fontSize: 14,
    color: "#6B8F7E",
    textAlign: "center",
    marginBottom: 12,
  },
  heroStatusRow: { flexDirection: "row", gap: 8 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusInactive: { backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 13, fontWeight: "600" },
  statusTextActive: { color: "#065F46" },
  statusTextInactive: { color: "#6B7280" },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A7062",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // Schedule chips
  scheduleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  scheduleChipText: { fontSize: 13, fontWeight: "600" },

  // Info card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#1B2D27",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#6B8F7E", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1B2D27" },
  infoDivider: { height: 1, backgroundColor: "#F3F4F6" },
  stockLowText: { color: "#B45309" },
  stockWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    marginTop: -4,
  },
  stockWarningText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500",
    flex: 1,
  },

  // Field (edit mode)
  fieldWrap: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A7062",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  required: { color: "#EF4444" },
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
  inputPlaceholder: { color: "#A0B5AC" },
  scheduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "47%",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C8E6D8",
    backgroundColor: "#fff",
    position: "relative",
  },
  scheduleCardActive: { backgroundColor: "#2D6A4F", borderColor: "#2D6A4F" },
  scheduleCardText: { fontSize: 13, fontWeight: "600", color: "#4A7062" },
  scheduleCardTextActive: { color: "#fff" },
  scheduleCheck: { position: "absolute", top: 6, right: 8 },
  dateInput: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { flex: 1, fontSize: 15, color: "#1B2D27" },
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

  // Buttons
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  deleteBtnText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
});
