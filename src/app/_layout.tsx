import { AuthProvider, useAuth } from "@/context/auth-context";
import { logout } from "@/lib/auth";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

console.log("[Temani] Root layout loaded");

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    try {
      console.log("[Temani] Redirect check", {
        loading,
        hasSession: !!session,
        hasProfile: !!profile,
        segments,
      });

      const inAuth = segments[0] === "(auth)";
      const inApp = segments[0] === "(app)";

      if (!session) {
        if (!inAuth) {
          console.log("[Temani] Redirecting to login");
          router.replace("/(auth)/login");
        }
      } else if (session && profile) {
        if (!inApp) {
          console.log("[Temani] Redirecting to dashboard");
          router.replace("/(app)/dashboard");
        }
      } else {
        console.log("[Temani] Session exists but profile missing, logging out");
        logout().catch((error) => {
          console.error("[Temani] Logout failed:", error);
        });
      }
    } catch (error) {
      console.error("[Temani] Root redirect failed:", error);
    }
  }, [session, profile, loading, segments, router]);

  return null;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <RootRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
