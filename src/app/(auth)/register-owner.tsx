import { registerOwner } from "@/lib/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";

const PRIMARY = "#2D6A4F";

export default function RegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !familyName) {
      Alert.alert("Lengkapi form", "Semua field wajib diisi");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Kata sandi terlalu pendek", "Minimal 8 karakter");
      return;
    }

    setLoading(true);
    try {
      const { familyCode } = await registerOwner(
        name,
        email,
        password,
        familyName,
      );

      // Tampilkan family code sebelum redirect
      Alert.alert(
        "🎉 Akun Berhasil Dibuat!",
        `Kode keluarga kamu:\n\n${familyCode}\n\nBagikan kode ini ke anggota keluarga lain agar bisa bergabung.`,
        [
          {
            text: "Lanjut ke Dashboard",
            onPress: () => {
              // RootRedirect otomatis handle redirect
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("Gagal mendaftar", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Buat Akun</Text>
        <Text style={styles.subtitle}>
          Kamu akan menjadi pengelola utama (Owner)
        </Text>

        <Text style={styles.label}>Nama Lengkap</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nama kamu"
          editable={!loading}
        />

        <Text style={styles.label}>Nama Keluarga</Text>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="cth: Keluarga Arsam"
          editable={!loading}
        />

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
          placeholder="Min. 8 karakter"
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Buat Akun</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register-caregiver")}
        >
          <Text style={styles.link}>
            Punya kode keluarga?{" "}
            <Text style={styles.linkBold}>Gabung sebagai Caregiver</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAF9" },
  container: { padding: 28, paddingTop: 16 },
  back: { marginBottom: 24 },
  backText: { color: PRIMARY, fontWeight: "600", fontSize: 14 },
  title: { fontSize: 26, fontWeight: "800", color: "#1B2D27", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6B8F7E", marginBottom: 32 },
  label: { fontSize: 13, fontWeight: "600", color: "#1B2D27", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8F0ED",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1B2D27",
    marginBottom: 14,
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
