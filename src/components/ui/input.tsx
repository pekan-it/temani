import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import { AuthColors } from "@/constants/auth-theme";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  /** When true, renders a show/hide toggle and masks input by default */
  isPassword?: boolean;
}

/**
 * Form input with floating label, leading icon, focus ring, and an optional
 * password visibility toggle. Used across the auth flow for a consistent feel.
 */
export function Input({
  label,
  icon,
  error,
  isPassword = false,
  editable = true,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(isPassword);

  const borderColor = error
    ? AuthColors.danger
    : focused
      ? AuthColors.primary
      : AuthColors.border;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          { borderColor },
          focused && styles.fieldFocused,
          !editable && styles.fieldDisabled,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? AuthColors.primary : AuthColors.muted}
            style={styles.leadingIcon}
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholderTextColor={AuthColors.placeholder}
          secureTextEntry={hidden}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setHidden((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={hidden ? "Tampilkan kata sandi" : "Sembunyikan kata sandi"}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={AuthColors.muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: AuthColors.text,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AuthColors.surface,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldFocused: {
    backgroundColor: "#fff",
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  leadingIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: AuthColors.text,
    height: "100%",
  },
  error: {
    fontSize: 12,
    color: AuthColors.danger,
    marginTop: 2,
  },
});
