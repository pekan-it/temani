import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";

import { AuthColors } from "@/constants/auth-theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary action button used across auth screens. Handles its own loading and
 * disabled states so callers only pass `loading`/`disabled`.
 */
export function Button({
  title,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    variant === "ghost" && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const textColor =
    variant === "primary" ? AuthColors.white : AuthColors.primary;

  return (
    <TouchableOpacity
      style={containerStyle}
      activeOpacity={0.85}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: AuthColors.primary,
    shadowColor: AuthColors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    backgroundColor: AuthColors.primarySoft,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.55,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
