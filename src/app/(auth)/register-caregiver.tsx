import { registerCaregiver } from "@/lib/auth";
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
    TouchableOpacity,
} from "react-native";

const PRIMARY = "#2D6A4F";

export default function RegisterCaregiverScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name || !email || !password || !familyCode) {
      Alert.alert("Lengkapi form", "Semua field wajib diisi");
      return;
    }
    if (familyCode.trim().length !== 6) {
      Alert.alert("Kode tidak valid", "Kode keluarga terdiri dari 6 karakter");
      return;
    }

    setLoading(true);
    try {
      const { family } = await registerCaregiver(
        name,
        email,
        password,
        familyCode,
      );
      Alert.alert(
        "✅ Berhasil Bergabung!",
        `Kamu sekarang bagian dari ${family.name}`,
        [{ text: "Lanjut", onPress: () => {} }],
      );
      // RootRedirect otomatis handle redirect setelah auth state berubah
    } catch (err: any) {
      Alert.alert("Gagal bergabung", err.message);
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

        <Text style={styles.title}>Gabung Keluarga</Text>
        <Text style={styles.subtitle}>
          Masukkan kode yang diberikan oleh pengelola utama
        </Text>

        {/* Family Code Input */}
        <TextInput
          style={styles.codeInput}
          value={familyCode}
          onChangeText={(t) => setFamilyCode(t.toUpperCase())}
          placeholder="XXXXXX"
          maxLength={6}
          autoCapitalize="characters"
          textAlign="center"
          editable={!loading}
        />
        <Text style={styles.codeHint}>
          Kode 6 karakter dari pengelola keluarga
        </Text>

        <Text style={styles.label}>Nama Lengkap</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nama kamu"
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
          onPress={handleJoin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Bergabung</Text>
          )}
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
  subtitle: { fontSize: 14, color: "#6B8F7E", marginBottom: 28 },
  codeInput: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 16,
    padding: 20,
    fontSize: 36,
    fontWeight: "800",
    color: "#1B2D27",
    letterSpacing: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  codeHint: {
    fontSize: 12,
    color: "#A0B5AC",
    textAlign: "center",
    marginBottom: 28,
  },
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
});
