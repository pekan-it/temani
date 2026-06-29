import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { login } from "@/lib/auth";
import { Image } from "expo-image";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email dan kata sandi wajib diisi");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Image
                source={require("@/assets/images/no-bg-temani.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logo}>Temani</Text>
            <Text style={styles.tagline}>Merawat bersama, lebih mudah</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Selamat datang</Text>
            <Text style={styles.cardSubtitle}>
              Masuk untuk melanjutkan merawat keluarga
            </Text>

            <View style={styles.form}>
              <Input
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="Masukkan Email"
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
                placeholder="Masukkan kata sandi"
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
                title="Masuk"
                onPress={handleLogin}
                loading={loading}
                style={styles.submit}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.footer}
            onPress={() => router.push("/(auth)/register-owner")}
            disabled={loading}
          >
            <Text style={styles.footerText}>
              Belum punya akun? <Text style={styles.footerLink}>Daftar</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  safe: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 40,
  },
  header: { alignItems: "center", marginBottom: 24 },
  logoImage: {
    width: 140,
    height: 140,
  },
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
  footerText: { fontSize: 14, color: AuthColors.muted },
  footerLink: { color: AuthColors.primary, fontWeight: "700" },
});
