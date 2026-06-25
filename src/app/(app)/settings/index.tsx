import { useAuth } from "@/context/auth-context";
import { logout } from "@/lib/auth";
import {
  NotificationPreferences,
  updateAvatarUrl,
  updateNotificationPreferences,
  updateProfile,
} from "@/lib/supabase/settings";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2D6A4F";
const MUTED = "#A0B5AC";
const BACKGROUND = "#F8FAF9";
const SURFACE = "#FFFFFF";
const TEXT_DARK = "#1B2D27";
const BORDER = "#E8F0ED";
const DANGER = "#DC2626";
const APP_VERSION = "1.0.0";
const PRIVACY_URL = "https://example.com/privacy";
const TERMS_URL = "https://example.com/terms";

export default function SettingsScreen() {
  const { profile, session, loading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [medicationReminders, setMedicationReminders] = useState(false);
  const [checkupReminders, setCheckupReminders] = useState(false);
  const [familyInvites, setFamilyInvites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (loading) return;

    setFullName(profile?.full_name ?? "");

    const metadata = session?.user.user_metadata as Record<string, any> | null;
    setPhone((metadata?.phone ?? "") as string);
    setAvatarUri((metadata?.avatar_url ?? null) as string | null);

    const preferences = metadata?.notification_preferences as
      | NotificationPreferences
      | undefined;
    setMedicationReminders(Boolean(preferences?.medicationReminders));
    setCheckupReminders(Boolean(preferences?.checkupReminders));
    setFamilyInvites(Boolean(preferences?.familyInvites));
  }, [loading, profile, session]);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Izin diperlukan",
        "Kami membutuhkan akses galeri untuk memperbarui foto profil.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets.length) return;

    const uri = result.assets[0].uri;
    if (!uri) return;

    setAvatarUri(uri);
    setStatusMessage("Foto profil telah diperbarui.");
    try {
      await updateAvatarUrl(uri);
      await refreshProfile();
    } catch (error) {
      setErrorMessage("Gagal menyimpan foto profil.");
    }
  }

  async function handleSaveSettings() {
    if (!fullName.trim()) {
      setErrorMessage("Nama lengkap tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await updateProfile(fullName.trim(), phone.trim() || null);
      await updateNotificationPreferences({
        medicationReminders,
        checkupReminders,
        familyInvites,
      });
      await refreshProfile();
      setStatusMessage("Perubahan berhasil disimpan.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan perubahan.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleOpenUrl(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert("Tidak dapat membuka tautan", "Silakan coba lagi nanti.");
    });
  }

  function handleLogout() {
    Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/login");
          } catch (error) {
            Alert.alert(
              "Gagal keluar",
              error instanceof Error ? error.message : "Terjadi kesalahan.",
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <Text style={styles.loadingText}>Memuat pengaturan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatarInitial = profile?.full_name?.charAt(0).toUpperCase() ?? "T";

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Pengaturan",
          headerShown: true,
          headerBackTitle: "Kembali",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {avatarInitial}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.full_name ?? "-"}
              </Text>
              <Text style={styles.profileEmail}>
                {session?.user.email ?? "-"}
              </Text>
              <TouchableOpacity
                style={styles.editPhotoButton}
                onPress={handlePickImage}
              >
                <Text style={styles.editPhotoButtonText}>Edit Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profil</Text>
          <Text style={styles.inputLabel}>Nama Lengkap</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nama lengkap"
            placeholderTextColor={MUTED}
          />
          <Text style={styles.inputLabel}>Nomor Telepon</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="081234567890"
            placeholderTextColor={MUTED}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keamanan</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push("/(app)/settings/change-password")}
          >
            <Text style={styles.linkButtonText}>Ganti Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifikasi</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Pengingat Obat</Text>
            <Switch
              value={medicationReminders}
              onValueChange={setMedicationReminders}
              thumbColor={medicationReminders ? PRIMARY : "#fff"}
              trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Jadwal Cek-up</Text>
            <Switch
              value={checkupReminders}
              onValueChange={setCheckupReminders}
              thumbColor={checkupReminders ? PRIMARY : "#fff"}
              trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Undangan Keluarga</Text>
            <Switch
              value={familyInvites}
              onValueChange={setFamilyInvites}
              thumbColor={familyInvites ? PRIMARY : "#fff"}
              trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
          <Text style={styles.infoText}>Versi aplikasi {APP_VERSION}</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => handleOpenUrl(PRIVACY_URL)}
          >
            <Text style={styles.linkText}>Kebijakan Privasi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => handleOpenUrl(TERMS_URL)}
          >
            <Text style={styles.linkText}>Syarat & Ketentuan</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSaveSettings}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: TEXT_DARK,
  },
  section: {
    marginBottom: 24,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  profileEmail: {
    marginTop: 4,
    color: MUTED,
    fontSize: 14,
  },
  editPhotoButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },
  editPhotoButtonText: {
    color: "#fff",
    fontWeight: "600",
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
    color: TEXT_DARK,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  linkButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  linkButtonText: {
    color: TEXT_DARK,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  toggleLabel: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  infoText: {
    color: MUTED,
    marginBottom: 12,
  },
  linkRow: {
    paddingVertical: 12,
  },
  linkText: {
    color: PRIMARY,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: DANGER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  errorText: {
    color: DANGER,
    fontSize: 14,
    marginBottom: 12,
  },
  statusText: {
    color: PRIMARY,
    fontSize: 14,
    marginBottom: 12,
  },
});
