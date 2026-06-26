import { registerPushToken } from "@/lib/notifications";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";

const PRIMARY = "#2D6A4F";
const MUTED = "#A0B5AC";

export default function AppLayout() {
  useEffect(() => {
    registerPushToken();
  }, []);

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
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Pengaturan",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="medications/index"
        options={{
          title: "Obat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments/add"
        options={{
          title: "Jadwal",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments/index"
        options={{
          title: "Jadwal",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/change-password"
        options={{
          title: "Password",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Sembunyikan route nested dari tab bar */}
      <Tabs.Screen name="patients/add" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]/edit" options={{ href: null }} />
      <Tabs.Screen
        name="medications/[medicationId]/index"
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
