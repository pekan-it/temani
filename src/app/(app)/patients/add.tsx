import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2D6A4F";
const BG = "#F8FAF9";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#A0B5AC";
const BORDER = "#E8F0ED";
const ERROR = "#EF4444";

type Gender = "Laki-laki" | "Perempuan" | "";

type FormData = {
  name: string;
  age: string;
  gender: Gender;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function PatientAddScreen() {
  const [form, setForm] = useState<FormData>({ name: "", age: "", gender: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Nama pasien wajib diisi";
    if (!form.age.trim()) {
      newErrors.age = "Usia wajib diisi";
    } else {
      const age = parseInt(form.age);
      if (isNaN(age) || age < 1 || age > 120)
        newErrors.age = "Usia tidak valid (1–120)";
    }
    if (!form.gender) newErrors.gender = "Jenis kelamin wajib dipilih";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      // Coba ambil family_id dari profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();

      if (profileError)
        throw new Error("Profil tidak ditemukan: " + profileError.message);
      if (!profile?.family_id)
        throw new Error("Anda belum tergabung dalam keluarga");

      const { error: insertError } = await supabase.from("patients").insert({
        family_id: profile.family_id,
        name: form.name.trim(),
        age: parseInt(form.age),
        diagnosis: "-", // default karena wajib di schema
        notes: form.gender, // simpan gender di notes
      });

      if (insertError) throw insertError;

      Alert.alert("Berhasil! 🎉", `${form.name} berhasil ditambahkan.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Gagal Menyimpan", err.message ?? "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tambah Pasien</Text>
            <Text style={styles.headerSub}>Isi data anggota keluarga</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Illustration */}
          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationCircle}>
              <Ionicons name="person-add" size={36} color={PRIMARY} />
            </View>
            <Text style={styles.illustrationTitle}>Data Pasien Baru</Text>
            <Text style={styles.illustrationSub}>
              Lengkapi informasi dasar pasien
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Nama */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nama Lengkap <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[styles.inputWrap, errors.name && styles.inputError]}
              >
                <Ionicons name="person-outline" size={16} color={TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={TEXT_MUTED}
                  value={form.name}
                  onChangeText={(v) => updateField("name", v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Usia */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Usia <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, errors.age && styles.inputError]}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={TEXT_MUTED}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 65"
                  placeholderTextColor={TEXT_MUTED}
                  value={form.age}
                  onChangeText={(v) =>
                    updateField("age", v.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="numeric"
                  maxLength={3}
                  returnKeyType="done"
                />
                <Text style={styles.inputSuffix}>tahun</Text>
              </View>
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>

            {/* Jenis Kelamin */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Jenis Kelamin <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.genderRow}>
                {(["Laki-laki", "Perempuan"] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      form.gender === g && styles.genderBtnActive,
                      errors.gender && styles.genderBtnError,
                    ]}
                    onPress={() => updateField("gender", g)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        g === "Laki-laki" ? "male-outline" : "female-outline"
                      }
                      size={18}
                      color={form.gender === g ? PRIMARY : TEXT_MUTED}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        form.gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender && (
                <Text style={styles.errorText}>{errors.gender}</Text>
              )}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.submitText}>Simpan Pasien</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK },
  headerSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 1 },

  // Scroll
  scroll: { padding: 20, paddingBottom: 48 },

  // Illustration
  illustrationWrap: { alignItems: "center", marginBottom: 24, gap: 6 },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  illustrationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  illustrationSub: { fontSize: 13, color: TEXT_MUTED },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Field
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: TEXT_DARK },
  required: { color: ERROR },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: BG,
  },
  inputError: { borderColor: ERROR },
  input: { flex: 1, fontSize: 15, color: TEXT_DARK },
  inputSuffix: { fontSize: 13, color: TEXT_MUTED },
  errorText: { fontSize: 12, color: ERROR },

  // Gender
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  genderBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "#E8F5F0",
  },
  genderBtnError: { borderColor: ERROR },
  genderText: { fontSize: 14, fontWeight: "500", color: TEXT_MUTED },
  genderTextActive: { color: PRIMARY, fontWeight: "700" },

  // Buttons
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 15, color: TEXT_MUTED, fontWeight: "500" },
});
