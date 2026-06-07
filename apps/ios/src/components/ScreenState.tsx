import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkles, type LucideIcon } from "lucide-react-native";

import { appTheme, withAlpha } from "../theme/appTheme";

type ScreenStateProps = {
  actionLabel?: string;
  Icon?: LucideIcon;
  message: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  Icon = Sparkles,
  message,
  onAction,
  title,
}: ScreenStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon color={appTheme.color.teal} size={28} strokeWidth={2.25} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenState(props: ScreenStateProps) {
  return <EmptyState {...props} />;
}

export function LoadingState({ label = "Chargement de Grumm." }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={appTheme.color.teal} size="small" />
      <Text style={styles.loading}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: appTheme.color.ink,
    borderRadius: appTheme.radius.control,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 46,
    minWidth: 160,
    paddingHorizontal: 18,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  icon: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.teal, 0.12),
    borderRadius: appTheme.radius.pill,
    height: 62,
    justifyContent: "center",
    marginBottom: 16,
    width: 62,
  },
  loading: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.semibold,
    marginTop: 12,
  },
  message: {
    color: appTheme.color.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 22,
    fontWeight: appTheme.weight.bold,
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
});
