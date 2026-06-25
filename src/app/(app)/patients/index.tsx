import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2D6A4F";
const BG = "#F8FAF9";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const TEXT_MUTED = "#A0B5AC";
const BORDER = "#E8F0ED";

type Patient = {
  id: string;
  family_id: string;
  name: string;
  age: number;
  diagnosis: string;
  notes: string | null;
  created_at: string;
};

export default function PatientListScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh list setiap kali screen difokus (misal: balik dari add screen)
  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, []),
  );

  async function fetchPatients() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak terautentikasi");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single();

      if (profileError)
        throw new Error("Profil tidak ditemukan: " + profileError.message);
      if (!profile?.family_id)
        throw new Error("Anda belum tergabung dalam keluarga");

      const { data, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false });

      if (patientsError) throw patientsError;
      setPatients(data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function getGenderIcon(notes: string | null) {
    if (notes === "Laki-laki") return "male";
    if (notes === "Perempuan") return "female";
    return "person";
  }

  function getGenderColor(notes: string | null) {
    if (notes === "Laki-laki") return "#3B82F6";
    if (notes === "Perempuan") return "#EC4899";
    return TEXT_MUTED;
  }

  function getAgeLabel(age: number) {
    if (age < 13) return "Anak-anak";
    if (age < 18) return "Remaja";
    if (age < 60) return "Dewasa";
    return "Lansia";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Memuat data pasien...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Gagal memuat data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPatients}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daftar Pasien</Text>
          <Text style={styles.headerSub}>
            {patients.length} pasien terdaftar
          </Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Ionicons name="people" size={22} color={PRIMARY} />
        </View>
      </View>

      {/* Content + FAB wrapper */}
      <View style={{ flex: 1 }}>
        {patients.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={56} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Belum ada pasien</Text>
            <Text style={styles.emptySub}>
              Tambahkan anggota keluarga yang membutuhkan perawatan
            </Text>
          </View>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const genderIcon = getGenderIcon(item.notes);
              const genderColor = getGenderColor(item.notes);
              const gender = item.notes ?? "Tidak diketahui";

              return (
                <View style={styles.card}>
                  {/* Avatar + Info */}
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            item.notes === "Laki-laki" ? "#EFF6FF" : "#FDF2F8",
                        },
                      ]}
                    >
                      <Ionicons
                        name={genderIcon as any}
                        size={24}
                        color={genderColor}
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.patientName}>{item.name}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={TEXT_MUTED}
                        />
                        <Text style={styles.metaText}>
                          {item.age} tahun · {getAgeLabel(item.age)}
                        </Text>
                        <View style={styles.dot} />
                        <Ionicons
                          name={genderIcon as any}
                          size={12}
                          color={genderColor}
                        />
                        <Text style={[styles.metaText, { color: genderColor }]}>
                          {gender}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(app)/patients/add")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Tambah Pasien</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD_BG,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: TEXT_DARK },
  headerSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
  },

  // List
  listContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: TEXT_MUTED },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEXT_MUTED,
    marginHorizontal: 2,
  },

  // Loading
  loadingText: { fontSize: 14, color: TEXT_MUTED, marginTop: 8 },

  // Error
  errorTitle: { fontSize: 16, fontWeight: "600", color: TEXT_DARK },
  errorSub: { fontSize: 13, color: TEXT_MUTED, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIMARY,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Empty
  emptyTitle: { fontSize: 16, fontWeight: "600", color: TEXT_DARK },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
