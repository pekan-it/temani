import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

// ── Locale Indonesia ──────────────────────────────────────────────
LocaleConfig.locales["id"] = {
  monthNames: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
  dayNames: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  dayNamesShort: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  today: "Hari ini",
};
LocaleConfig.defaultLocale = "id";

// ── Constants ─────────────────────────────────────────────────────
const PRIMARY = "#2D6A4F";
const DANGER = "#DC2626";
const MUTED = "#A0B5AC";
const BG = "#F8FAF9";
const CARD = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#6B7A77";
const BORDER = "#E2EBE8";
const PURPLE = "#8B5CF6";

type AppointmentType = "kontrol_rutin" | "ambil_resep" | "cek_lab" | "lainnya";

const APPOINTMENT_TYPES: {
  value: AppointmentType;
  label: string;
  icon: string;
}[] = [
  { value: "kontrol_rutin", label: "Kontrol Rutin", icon: "medical-outline" },
  { value: "ambil_resep", label: "Ambil Resep", icon: "document-text-outline" },
  { value: "cek_lab", label: "Cek Lab", icon: "flask-outline" },
  { value: "lainnya", label: "Lainnya", icon: "ellipsis-horizontal-outline" },
];

// Time slots 06:00 – 20:30 per 30 menit
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

type Patient = { id: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────
function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "Pilih tanggal";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getShiftLabel(timeStr: string): string | null {
  const h = parseInt(timeStr.split(":")[0], 10);
  const shiftStarts = [6, 12, 15, 18];
  if (!shiftStarts.includes(h) || !timeStr.endsWith(":00")) return null;
  if (h === 6) return "Pagi";
  if (h === 12) return "Siang";
  if (h === 15) return "Sore";
  if (h === 18) return "Malam";
  return null;
}

// ── Component ─────────────────────────────────────────────────────
export function CheckupForm() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>("kontrol_rutin");
  const [hospitalName, setHospitalName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [notes, setNotes] = useState("");

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = toDateKey(new Date());

  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return toDateKey(d);
  })();

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      const { data: prof } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();
      if (!prof?.family_id) throw new Error("Family tidak ditemukan");

      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("family_id", prof.family_id)
        .order("name");

      if (error) throw error;
      setPatients(data ?? []);
      if (data && data.length > 0) setSelectedPatientId(data[0].id);
    } catch (err: any) {
      console.error("loadPatients:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearErr(key: string) {
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!selectedPatientId) e.patient = "Pilih pasien terlebih dahulu";
    if (!hospitalName.trim())
      e.hospital = "Nama rumah sakit / klinik wajib diisi";
    if (!doctorName.trim()) e.doctor = "Nama dokter wajib diisi";
    if (!selectedDate) e.date = "Pilih tanggal cek-up";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      const { data: prof } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();
      if (!prof?.family_id) throw new Error("Family tidak ditemukan");

      const { error } = await supabase.from("appointments").insert({
        patient_id: selectedPatientId,
        family_id: prof.family_id,
        hospital_name: hospitalName.trim(),
        doctor_name: doctorName.trim(),
        appointment_type: appointmentType,
        scheduled_date: selectedDate,
        scheduled_time: `${selectedTime}:00`,
        notes: notes.trim() || null,
        status: "scheduled",
      });

      if (error) throw error;
      router.back();
    } catch (err: any) {
      setErrors({ submit: err.message ?? "Gagal menyimpan jadwal" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerLoader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.form}>
          {/* ── Pasien ── */}
          <Field label="Pasien *" error={errors.patient}>
            {patients.length === 0 ? (
              <View style={s.emptyPatient}>
                <Ionicons name="people-outline" size={18} color={MUTED} />
                <Text style={s.emptyPatientText}>
                  Belum ada pasien terdaftar
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.patientRow}
              >
                {patients.map((p) => {
                  const active = selectedPatientId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.patientChip, active && s.patientChipActive]}
                      onPress={() => {
                        setSelectedPatientId(p.id);
                        clearErr("patient");
                      }}
                    >
                      <Ionicons
                        name="person-outline"
                        size={12}
                        color={active ? "#fff" : TEXT_MUTED}
                      />
                      <Text
                        style={[
                          s.patientChipText,
                          active && s.patientChipTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Field>

          {/* ── Jenis Kunjungan ── */}
          <Field label="Jenis Kunjungan *">
            <View style={s.typeGrid}>
              {APPOINTMENT_TYPES.map((t) => {
                const active = appointmentType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.typeCard, active && s.typeCardActive]}
                    onPress={() => setAppointmentType(t.value)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={16}
                      color={active ? "#fff" : TEXT_MUTED}
                    />
                    <Text style={[s.typeLabel, active && s.typeLabelActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* ── Nama RS / Klinik ── */}
          <Field label="Rumah Sakit / Klinik *" error={errors.hospital}>
            <InputRow
              icon="business-outline"
              placeholder="Misal: RSUD Dr. Soetomo"
              value={hospitalName}
              onChangeText={(v) => {
                setHospitalName(v);
                clearErr("hospital");
              }}
              hasError={!!errors.hospital}
              editable={!submitting}
            />
          </Field>

          {/* ── Nama Dokter ── */}
          <Field label="Nama Dokter *" error={errors.doctor}>
            <InputRow
              icon="person-outline"
              placeholder="Misal: dr. Budi Santoso, Sp.PD"
              value={doctorName}
              onChangeText={(v) => {
                setDoctorName(v);
                clearErr("doctor");
              }}
              hasError={!!errors.doctor}
              editable={!submitting}
            />
          </Field>

          {/* ── Tanggal + Waktu (berdampingan) ── */}
          <View style={s.dateTimeRow}>
            <Field label="Tanggal *" error={errors.date} style={{ flex: 1.7 }}>
              <TouchableOpacity
                style={[s.pickerBtn, errors.date && s.pickerBtnError]}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={15} color={PRIMARY} />
                <Text
                  style={[s.pickerBtnText, !selectedDate && { color: MUTED }]}
                  numberOfLines={1}
                >
                  {selectedDate
                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )
                    : "Pilih"}
                </Text>
                <Ionicons name="chevron-down" size={13} color={MUTED} />
              </TouchableOpacity>
            </Field>

            <Field label="Waktu *" style={{ flex: 1 }}>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={15} color={PURPLE} />
                <Text style={s.pickerBtnText}>{selectedTime}</Text>
                <Ionicons name="chevron-down" size={13} color={MUTED} />
              </TouchableOpacity>
            </Field>
          </View>

          {/* Tampilkan tanggal lengkap di bawah jika sudah dipilih */}
          {selectedDate ? (
            <View style={s.datePreview}>
              <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
              <Text style={s.datePreviewText}>
                {formatDisplayDate(selectedDate)} · {selectedTime}
              </Text>
            </View>
          ) : null}

          {/* ── Catatan ── */}
          <Field label="Catatan (Opsional)">
            <TextInput
              style={s.textArea}
              placeholder="Misal: Bawa hasil lab sebelumnya, puasa 8 jam"
              placeholderTextColor={MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!submitting}
              textAlignVertical="top"
            />
          </Field>

          {/* ── Submit error ── */}
          {errors.submit ? (
            <View style={s.errorAlert}>
              <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
              <Text style={s.errorAlertText}>{errors.submit}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={s.submitBtnText}>Simpan Jadwal</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ════ Modal Kalender ════ */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Pilih Tanggal</Text>

            <Calendar
              current={selectedDate || today}
              minDate={today}
              maxDate={maxDate}
              onDayPress={(day: { dateString: string }) => {
                setSelectedDate(day.dateString);
                clearErr("date");
                setShowCalendar(false);
              }}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: PRIMARY },
                ...(selectedDate !== today
                  ? { [today]: { marked: true, dotColor: PRIMARY } }
                  : {}),
              }}
              theme={{
                backgroundColor: CARD,
                calendarBackground: CARD,
                selectedDayBackgroundColor: PRIMARY,
                selectedDayTextColor: "#fff",
                todayTextColor: PRIMARY,
                todayBackgroundColor: "#E8F5F0",
                dayTextColor: TEXT_DARK,
                textDisabledColor: "#C5D5D0",
                dotColor: PRIMARY,
                arrowColor: PRIMARY,
                monthTextColor: TEXT_DARK,
                textDayFontWeight: "500",
                textMonthFontWeight: "700",
                textDayHeaderFontWeight: "600",
                textDayFontSize: 14,
                textMonthFontSize: 15,
                textDayHeaderFontSize: 12,
              }}
              style={s.calendar}
            />

            <TouchableOpacity
              style={s.sheetClose}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={s.sheetCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ════ Modal Waktu ════ */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Pilih Waktu</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={s.timeList}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {TIME_SLOTS.map((t) => {
                const active = t === selectedTime;
                const shiftLabel = getShiftLabel(t);
                return (
                  <View key={t}>
                    {shiftLabel ? (
                      <Text style={s.timeShiftLabel}>{shiftLabel}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[s.timeOption, active && s.timeOptionActive]}
                      onPress={() => {
                        setSelectedTime(t);
                        setShowTimePicker(false);
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={active ? PRIMARY : MUTED}
                      />
                      <Text
                        style={[
                          s.timeOptionText,
                          active && s.timeOptionTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={16} color={PRIMARY} />
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={s.sheetClose}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={s.sheetCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[s.fieldGroup, style]}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  hasError,
  editable,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  hasError?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={[s.inputRow, hasError && s.inputRowError]}>
      <Ionicons name={icon as any} size={16} color={MUTED} />
      <TextInput
        style={s.inputInner}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  form: { paddingVertical: 20, paddingHorizontal: 16, gap: 20 },

  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: TEXT_DARK },
  errorText: { fontSize: 12, color: DANGER },

  patientRow: { gap: 8, paddingVertical: 2 },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  patientChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  patientChipText: { fontSize: 13, fontWeight: "500", color: TEXT_DARK },
  patientChipTextActive: { color: "#fff" },
  emptyPatient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  emptyPatientText: { fontSize: 13, color: MUTED },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    flex: 1,
    minWidth: "46%",
  },
  typeCardActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typeLabel: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED, flex: 1 },
  typeLabelActive: { color: "#fff" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: CARD,
  },
  inputRowError: { borderColor: DANGER },
  inputInner: { flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0 },

  dateTimeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },

  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: CARD,
  },
  pickerBtnError: { borderColor: DANGER },
  pickerBtnText: { flex: 1, fontSize: 13, fontWeight: "500", color: TEXT_DARK },

  datePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
  },
  datePreviewText: { fontSize: 12, color: PRIMARY, fontWeight: "600" },

  textArea: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: CARD,
    minHeight: 96,
  },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorAlertText: { fontSize: 13, color: DANGER, flex: 1 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sheetClose: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
  },
  sheetCloseText: { fontSize: 15, fontWeight: "600", color: PRIMARY },

  calendar: { borderRadius: 0 },

  timeList: { maxHeight: 340 },
  timeShiftLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  timeOptionActive: { backgroundColor: "#E8F5F0" },
  timeOptionText: { flex: 1, fontSize: 14, color: TEXT_DARK },
  timeOptionTextActive: { fontWeight: "700", color: PRIMARY },
});
