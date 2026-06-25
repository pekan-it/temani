import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Stack } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const PRIMARY = "#2D6A4F";
const BACKGROUND = "#F8FAF9";
const BORDER = "#E8E8E8";
const TEXT_DARK = "#1B2D27";
const DANGER = "#DC2626";
const MUTED = "#6B7A77";

export default function ChangePasswordScreen() {
  const { session, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleChangePassword() {
    setErrorMessage("");

    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setErrorMessage("Semua field harus diisi.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Password baru tidak cocok.");
      return;
    }

    const email = session?.user?.email;
    if (!email) {
      setErrorMessage("Email pengguna tidak ditemukan.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (authError) {
        throw new Error("Password saat ini salah.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      Alert.alert("Berhasil", "Password berhasil diubah.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memperbarui password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Ganti Password",
          headerShown: true,
          headerBackTitle: "Kembali",
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keamanan Akun</Text>
          <Text style={styles.inputLabel}>Password Saat Ini</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Masukkan password saat ini"
            placeholderTextColor={MUTED}
          />
          <Text style={styles.inputLabel}>Password Baru</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Password baru"
            placeholderTextColor={MUTED}
          />
          <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Ulangi password baru"
            placeholderTextColor={MUTED}
          />
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.saveButton, submitting && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={submitting}
          >
            <Text style={styles.saveButtonText}>
              {submitting ? "Memperbarui..." : "Ganti Password"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    padding: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 16,
  },
  inputLabel: {
    color: TEXT_DARK,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    color: TEXT_DARK,
  },
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: DANGER,
    marginBottom: 16,
  },
});
