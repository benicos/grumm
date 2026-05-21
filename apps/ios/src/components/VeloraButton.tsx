import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type VeloraButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  variant?: "primary" | "secondary" | "ghost";
};

export function VeloraButton({
  children,
  disabled = false,
  isLoading = false,
  onPress,
  style,
  variant = "primary",
}: VeloraButtonProps) {
  const isDisabled = disabled || isLoading;

  if (variant === "primary") {
    return (
      <Pressable disabled={isDisabled} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed, style]}>
        <LinearGradient colors={[colors.accent, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
          {isLoading ? <ActivityIndicator color="#09111d" /> : <Text style={styles.primaryText}>{children}</Text>}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : styles.ghost,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? <ActivityIndicator color={colors.text} /> : <Text style={variant === "secondary" ? styles.secondaryText : styles.ghostText}>{children}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.55,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  primary: {
    alignItems: "center",
    borderRadius: 16,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: colors.accent,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
  },
  primaryText: {
    color: "#09111d",
    fontSize: 16,
    fontWeight: "800",
  },
  secondary: {
    backgroundColor: colors.soft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
