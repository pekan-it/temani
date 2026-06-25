import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2D6A4F";

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert("Keluar", "Kamu yakin ingin keluar dari akun ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await supabase.auth.signOut();
            router.replace("/(auth)/login");
          } catch (err: any) {
            Alert.alert("Gagal keluar", err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="settings-outline" size={48} color="#A0B5AC" />
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.sub}>Segera hadir</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutBtn, loading && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#C0392B" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#C0392B" />
              <Text style={styles.logoutText}>Keluar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAF9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2D27" },
  sub: { fontSize: 14, color: "#A0B5AC" },

  footer: {
    padding: 24,
    paddingBottom: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F5C6C2",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FEF5F4",
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#C0392B",
  },
});
