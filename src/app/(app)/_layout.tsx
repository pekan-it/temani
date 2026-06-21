import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const PRIMARY = "#2D6A4F";
const MUTED = "#A0B5AC";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E8F0ED",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients/index"
        options={{
          title: "Pasien",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="care-score/index"
        options={{
          title: "Care Score",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Pengaturan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Sembunyikan route nested dari tab bar */}
      <Tabs.Screen name="patients/add" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]/edit" options={{ href: null }} />
      <Tabs.Screen
        name="medications/[patientId]/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="medications/[patientId]/add"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="appointments/[patientId]/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="appointments/[patientId]/add"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="appointments/[patientId]/[appointmentId]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
