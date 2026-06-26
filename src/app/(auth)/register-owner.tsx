import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthColors } from "@/constants/auth-theme";
import { logout, registerOwner } from "@/lib/auth";

export default function RegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password || !familyName) {
      setError("Semua field wajib diisi");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { familyCode } = await registerOwner(
        name,
        email,
        password,
        familyName,
      );

      // Sign out setelah daftar agar user masuk lewat halaman login.
      await logout();

      Alert.alert(
        "🎉 Akun Berhasil Dibuat!",
        `Kode keluarga kamu:\n\n${familyCode}\n\nSimpan & bagikan kode ini ke anggota keluarga lain. Silakan masuk dengan akunmu.`,
        [{ text: "Masuk", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={AuthColors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="heart" size={30} color={AuthColors.white} />
            </View>
            <Text style={styles.logo}>Temani</Text>
            <Text style={styles.tagline}>Merawat bersama, lebih mudah</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={AuthColors.primary}
              />
              <Text style={styles.roleBadgeText}>Pengelola Utama</Text>
            </View>

            <Text style={styles.cardTitle}>Daftar Akun</Text>
            <Text style={styles.cardSubtitle}>
              Daftarkan diri kamu sebagai pengelola utama keluarga
            </Text>

            <View style={styles.form}>
              <Input
                label="Nama Lengkap"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Nama kamu"
                editable={!loading}
              />

              <Input
                label="Nama Keluarga"
                icon="people-outline"
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="cth: Keluarga Arsam"
                editable={!loading}
              />

              <Input
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />

              <Input
                label="Kata Sandi"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 karakter"
                isPassword
                editable={!loading}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={AuthColors.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Buat Akun"
                onPress={handleRegister}
                loading={loading}
                style={styles.submit}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.footer}
            onPress={() => router.push("/(auth)/register-caregiver")}
            disabled={loading}
          >
            <Text style={styles.footerText}>
              Punya kode keluarga?{" "}
              <Text style={styles.footerLink}>Gabung sebagai Caregiver</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/(auth)/login")}
            disabled={loading}
          >
            <Text style={styles.footerText}>
              Sudah punya akun? <Text style={styles.footerLink}>Masuk</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AuthColors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: AuthColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  header: { alignItems: "center", marginBottom: 24 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: AuthColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: AuthColors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: { fontSize: 30, fontWeight: "800", color: AuthColors.text },
  tagline: { fontSize: 14, color: AuthColors.muted, marginTop: 4 },
  card: {
    backgroundColor: AuthColors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#1B2D27",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: AuthColors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: AuthColors.primary,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: AuthColors.text },
  cardSubtitle: {
    fontSize: 14,
    color: AuthColors.muted,
    marginTop: 4,
    marginBottom: 20,
  },
  form: { gap: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: AuthColors.danger },
  submit: { marginTop: 4 },
  footer: { alignItems: "center", marginTop: 24 },
  loginLink: { alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 14, color: AuthColors.muted },
  footerLink: { color: AuthColors.primary, fontWeight: "700" },
});
