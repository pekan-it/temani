import { login } from "@/lib/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const PRIMARY = "#2D6A4F";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lengkapi form", "Email dan kata sandi wajib diisi");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // RootRedirect di _layout.tsx akan otomatis redirect ke dashboard
    } catch (err: any) {
      Alert.alert("Gagal masuk", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>Temani</Text>
          <Text style={styles.tagline}>Merawat bersama, lebih mudah</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Kata Sandi</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register-owner")}
          >
            <Text style={styles.link}>
              Belum punya akun? <Text style={styles.linkBold}>Daftar</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAF9" },
  container: { flex: 1, padding: 28, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 48 },
  logo: { fontSize: 32, fontWeight: "800", color: "#1B2D27" },
  tagline: { fontSize: 14, color: "#6B8F7E", marginTop: 6 },
  form: { gap: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#1B2D27", marginBottom: 2 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8F0ED",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1B2D27",
    marginBottom: 6,
  },
  btn: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { textAlign: "center", color: "#6B8F7E", marginTop: 16, fontSize: 14 },
  linkBold: { color: PRIMARY, fontWeight: "700" },
});
