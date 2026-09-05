/**
 * components/ui/Input.tsx
 * OpusHunter — Input Component.
 * Dark-surface input with glow focus, error state, password toggle, and
 * optional leading icon. Works on Web, iOS, and Android. All colors resolve
 * from constants/theme.ts — no hardcoded hex.
 */

import React, { useState } from "react";
import { View, TextInput, Text, Pressable, StyleSheet } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, radius } from "../../constants/theme";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon?: React.ReactNode;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: any;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  icon,
  disabled = false,
  multiline = false,
  numberOfLines,
  maxLength,
  style,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.dim}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // @ts-ignore: outlineStyle is a web-only TextInput prop absent from RN types.
          outlineStyle="none"
        />

        {secureTextEntry && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconRight}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityState={{ expanded: showPassword }}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.text.dim} />
            ) : (
              <Eye size={18} color={colors.text.dim} />
            )}
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.core,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.md,
    minHeight: 50,
    paddingHorizontal: 12,
  },

  inputWrapperMultiline: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },

  inputWrapperFocused: {
    borderColor: colors.accent.cyan,
  },

  inputWrapperError: {
    borderColor: colors.accent.red,
  },

  inputWrapperDisabled: {
    opacity: 0.5,
  },

  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingVertical: 14,
  },

  inputMultiline: {
    paddingVertical: 0,
    minHeight: 100,
  },

  iconLeft: {
    marginRight: 8,
  },

  iconRight: {
    width: 44,
    minHeight: 44,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    color: colors.accent.red,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});
