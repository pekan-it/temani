import { useAuth } from "@/context/auth-context";
import { createCheckupSchedule } from "@/lib/supabase/appointments";
import { getPatients } from "@/lib/supabase/patients";
import { Patient } from "@/types/database";
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

const PRIMARY = "#2D6A4F";
const DANGER = "#DC2626";
const MUTED = "#A0B5AC";
const BACKGROUND = "#F8FAF9";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#6B7A77";
const BORDER = "#E2EBE8";

export function CheckupForm() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!selectedPatientId.trim()) {
      newErrors.patient = "Pilih pasien";
    }
    if (!scheduledDate) {
      newErrors.scheduledDate = "Pilih tanggal cek-up";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const dateStr = scheduledDate.toISOString().split("T")[0];

      await createCheckupSchedule({
        patientId: selectedPatientId,
        scheduledDate: dateStr,
        doctorName: doctorName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      router.back();
    } catch (error) {
      console.error("Error creating checkup:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Gagal menyimpan",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDateChange(date: Date) {
    setScheduledDate(date);
    setShowDatePicker(false);
    setErrors({ ...errors, scheduledDate: "" });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Patient Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pasien *</Text>
            <View style={styles.selectContainer}>
              <View
                style={[styles.select, errors.patient && styles.selectError]}
              >
                {patients.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.patientList}
                  >
                    {patients.map((patient) => (
                      <TouchableOpacity
                        key={patient.id}
                        style={[
                          styles.patientButton,
                          selectedPatientId === patient.id &&
                            styles.patientButtonActive,
                        ]}
                        onPress={() => {
                          setSelectedPatientId(patient.id);
                          setErrors({ ...errors, patient: "" });
                        }}
                      >
                        <Text
                          style={[
                            styles.patientButtonText,
                            selectedPatientId === patient.id &&
                              styles.patientButtonTextActive,
                          ]}
                        >
                          {patient.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.placeholderText}>Tidak ada pasien</Text>
                )}
              </View>
            </View>
            {errors.patient && (
              <Text style={styles.errorText}>{errors.patient}</Text>
            )}
          </View>

          {/* Checkup Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tanggal Cek-up *</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                errors.scheduledDate && styles.dateButtonError,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {scheduledDate.toLocaleDateString("id-ID", {
                  weekday: "short",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>
            {errors.scheduledDate && (
              <Text style={styles.errorText}>{errors.scheduledDate}</Text>
            )}
          </View>

          {showDatePicker && (
            <Modal
              transparent
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                onPress={() => setShowDatePicker(false)}
              >
                <View
                  style={styles.modalContent}
                  onStartShouldSetResponder={() => true}
                >
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>Pilih Tanggal</Text>
                  </View>

                  <ScrollView
                    style={styles.dateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 30 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const isSelected =
                        date.toDateString() === scheduledDate.toDateString();
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.dateOption,
                            isSelected && styles.dateOptionActive,
                          ]}
                          onPress={() => handleDateChange(date)}
                        >
                          <Text
                            style={[
                              styles.dateOptionText,
                              isSelected && styles.dateOptionTextActive,
                            ]}
                          >
                            {date.toLocaleDateString("id-ID", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.datePickerClose}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerCloseText}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Doctor Name (Optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Dokter (Opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Misal: dr. Budi"
              placeholderTextColor={MUTED}
              value={doctorName}
              onChangeText={setDoctorName}
              editable={!submitting}
            />
          </View>

          {/* Notes (Optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Catatan (Opsional)</Text>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="Misal: Bawa resep sebelumnya, puasa sebelum tes"
              placeholderTextColor={MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!submitting}
            />
          </View>

          {/* Submit Error */}
          {errors.submit && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{errors.submit}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Simpan Jadwal</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  selectContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  select: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  selectError: {
    borderColor: DANGER,
  },
  patientList: {
    paddingVertical: 8,
  },
  patientButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  patientButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  patientButtonText: {
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: "500",
  },
  patientButtonTextActive: {
    color: "#fff",
  },
  placeholderText: {
    fontSize: 14,
    color: MUTED,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dateButtonError: {
    borderColor: DANGER,
  },
  dateButtonText: {
    fontSize: 14,
    color: TEXT_DARK,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: "#fff",
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: DANGER,
  },
  errorAlert: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorAlertText: {
    fontSize: 14,
    color: DANGER,
  },
  submitButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: BACKGROUND,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  datePickerHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  dateList: {
    maxHeight: 300,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dateOptionActive: {
    backgroundColor: "#E8F4F0",
  },
  dateOptionText: {
    fontSize: 14,
    color: TEXT_DARK,
  },
  dateOptionTextActive: {
    fontWeight: "600",
    color: PRIMARY,
  },
  datePickerClose: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  datePickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY,
  },
});
