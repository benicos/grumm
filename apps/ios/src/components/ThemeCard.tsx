import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeIcon } from "./ThemeIcon";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { CategorySummary } from "../types/domain";

type ThemeCardProps = {
  description: string;
  onPress: () => void | Promise<void>;
  theme: CategorySummary;
};

export function ThemeCard({ description, onPress, theme }: ThemeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.card,
        { borderColor: withAlpha(theme.accent, 0.28) },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.aura, { backgroundColor: withAlpha(theme.accent, 0.13) }]} />
      <View style={[styles.icon, { backgroundColor: withAlpha(theme.accent, 0.18) }]}>
        <ThemeIcon color={theme.accent} name={theme.themeIcon} size={22} strokeWidth={2.4} />
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {theme.name}
      </Text>
      <Text numberOfLines={2} style={styles.description}>
        {description}
      </Text>
      <Text style={[styles.count, { color: theme.accent }]}>
        {theme.count ? `${theme.count} faits` : "Explorer"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aura: {
    borderRadius: 80,
    height: 112,
    position: "absolute",
    right: -44,
    top: -48,
    width: 112,
  },
  card: {
    backgroundColor: appTheme.color.card,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 164,
    minWidth: "47%",
    overflow: "hidden",
    padding: 15,
    ...appTheme.shadow.card,
  },
  count: {
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    marginTop: "auto",
  },
  description: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 6,
  },
  icon: {
    alignItems: "center",
    borderRadius: 17,
    height: 42,
    justifyContent: "center",
    marginBottom: 14,
    width: 42,
  },
  name: {
    color: appTheme.color.ink,
    fontSize: 18,
    fontWeight: appTheme.weight.bold,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
