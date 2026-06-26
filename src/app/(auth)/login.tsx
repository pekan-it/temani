import { login } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      {/* Background image — atas layar */}
      <Image
        source={require("@/assets/images/bgtemani2.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Fade overlay tipis di batas bawah gambar */}
      <View style={styles.bgFade} pointerEvents="none" />

      {/* Konten utama */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Spacer mendorong konten ke ~45% bawah layar */}
          <View style={styles.spacer} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Temani</Text>
            <Text style={styles.tagline}>Merawat bersama, lebih mudah</Text>
          </View>

          {/* Card form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke akun</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholderTextColor="#A0B5AC"
            />

            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                editable={!loading}
                placeholderTextColor="#A0B5AC"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#A0B5AC"
                />
              </TouchableOpacity>
            </View>

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

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FBF7F2",
  },
  flex: {
    flex: 1,
  },

  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.52,
    width: "100%",
  },

  bgFade: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.38,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "#FBF7F2",
    opacity: 0.55,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  spacer: {
    height: SCREEN_HEIGHT * 0.38,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1B2D27",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#6B8F7E",
    marginTop: 4,
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#2D6A4F",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B2D27",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1B2D27",
    marginBottom: 2,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E8F0ED",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1B2D27",
  },

  // Password field dengan tombol mata
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E8F0ED",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1B2D27",
  },
  eyeBtn: {
    padding: 4,
  },

  btn: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: {
    textAlign: "center",
    color: "#6B8F7E",
    marginTop: 14,
    fontSize: 14,
  },
  linkBold: { color: PRIMARY, fontWeight: "700" },
});
