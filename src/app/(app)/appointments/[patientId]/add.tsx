import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function AppointmentAddScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="calendar-number-outline" size={48} color="#A0B5AC" />
        <Text style={styles.title}>Tambah Cek-up</Text>
        <Text style={styles.sub}>Segera hadir</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAF9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2D27" },
  sub: { fontSize: 14, color: "#A0B5AC" },
});
