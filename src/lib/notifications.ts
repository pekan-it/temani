import { supabase } from "@/lib/supabase/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const isExpoGoEnvironment =
  Constants.appOwnership === "expo" || Constants.appOwnership === "guest";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken() {
  if (!Device.isDevice || Platform.OS === "web") {
    return null;
  }

  if (isExpoGoEnvironment) {
    console.log(
      "[Temani] Push notifications skipped in Expo Go. Use a development build.",
    );
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Temani",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2D6A4F",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("[Temani] EAS projectId tidak ditemukan");
    return null;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log("[Temani] Push token acquired", token);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ push_token: token })
        .eq("id", user.id);
    }

    return token;
  } catch (error) {
    console.error("[Temani] Failed to register push token:", error);
    return null;
  }

  return null;
}
