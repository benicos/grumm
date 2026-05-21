import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { GrummButton } from "./GrummButton";
import { GrummLoader } from "./GrummLoader";

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
      {actionLabel && onAction ? <GrummButton onPress={onAction} style={styles.action}>{actionLabel}</GrummButton> : null}
    </View>
  );
}

export function LoadingState({ label = "Chargement de Grumm." }: { label?: string }) {
  return <GrummLoader label={label} />;
}

const styles = StyleSheet.create({
  action: {
    marginTop: 24,
    minWidth: 190,
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
