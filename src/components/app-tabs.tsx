import { Tabs } from "expo-router";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

// Simple icon component menggunakan emoji/unicode
// Ganti dengan @expo/vector-icons jika sudah terinstall dengan benar
function TabIcon({
  emoji,
  focused,
  color,
}: {
  emoji: string;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const PRIMARY = "#1D9E75";
  const BG = isDark ? "#0F1A16" : "#F5F7F2";
  const SURFACE = isDark ? "#1A2E24" : "#FFFFFF";
  const BORDER = isDark ? "#2A3D30" : "#E2E6DF";
  const TEXT_INACTIVE = isDark ? "#5A7A6A" : "#9AA89A";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          borderTopWidth: 0.5,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: TEXT_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" focused={focused} color={PRIMARY} />
          ),
        }}
      />

      <Tabs.Screen
        name="patients"
        options={{
          title: "Pasien",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" focused={focused} color={PRIMARY} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Jadwal",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" focused={focused} color={PRIMARY} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Pengaturan",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" focused={focused} color={PRIMARY} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: "#E1F5EE",
  },
  iconEmoji: {
    fontSize: 18,
  },
});
