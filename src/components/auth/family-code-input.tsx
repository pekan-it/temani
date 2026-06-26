import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthColors } from "@/constants/auth-theme";

const CODE_LENGTH = 6;

interface FamilyCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
}

/**
 * Segmented 6-character family code input. A single hidden TextInput captures
 * keystrokes while we render one box per character — the active box is the
 * next empty slot, which reads more clearly than a long letter-spaced field.
 */
export function FamilyCodeInput({
  value,
  onChangeText,
  editable = true,
}: FamilyCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);
    onChangeText(cleaned);
  };

  const cells = Array.from({ length: CODE_LENGTH });

  return (
    <Pressable
      style={styles.row}
      onPress={() => inputRef.current?.focus()}
      disabled={!editable}
    >
      {cells.map((_, index) => {
        const char = value[index] ?? "";
        const isActive = focused && index === value.length;
        const isFilled = char !== "";

        return (
          <View
            key={index}
            style={[
              styles.cell,
              isFilled && styles.cellFilled,
              isActive && styles.cellActive,
            ]}
          >
            <Text style={styles.cellText}>{char}</Text>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AuthColors.border,
    backgroundColor: AuthColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: {
    borderColor: AuthColors.primary,
    backgroundColor: AuthColors.white,
  },
  cellActive: {
    borderColor: AuthColors.primary,
    backgroundColor: AuthColors.white,
  },
  cellText: {
    fontSize: 26,
    fontWeight: "800",
    color: AuthColors.text,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
