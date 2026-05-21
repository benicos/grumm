import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { VeloraButton } from "./VeloraButton";

type ScreenStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
};

export function ScreenState({ actionLabel, message, onAction, title }: ScreenStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <VeloraButton onPress={onAction} style={styles.action}>{actionLabel}</VeloraButton> : null}
    </View>
  );
}

export function LoadingState({ label = "Chargement de Velora..." }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.loading}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 24,
    minWidth: 190,
  },
  loading: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 18,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
});
