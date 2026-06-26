import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthColors } from "@/constants/auth-theme";

/**
 * Full-screen loading state shown while the auth/session check is in flight,
 * so users never see a flash of the wrong screen before the redirect resolves.
 */
export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AuthColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AuthColors.background,
  },
});
