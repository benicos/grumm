import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { appTheme, withAlpha } from "../theme/appTheme";

type ProfileStatProps = {
  Icon: LucideIcon;
  color: string;
  label: string;
  value: number | string;
};

export function ProfileStat({ Icon, color, label, value }: ProfileStatProps) {
  return (
    <View style={styles.stat}>
      <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon color={color} size={18} strokeWidth={2.35} />
      </View>
      <Text numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    marginBottom: 10,
    width: 34,
  },
  label: {
    color: appTheme.color.muted,
    fontSize: 12,
    fontWeight: appTheme.weight.medium,
    lineHeight: 16,
  },
  stat: {
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 112,
    minWidth: "47%",
    padding: 14,
    ...appTheme.shadow.card,
  },
  value: {
    color: appTheme.color.ink,
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
    lineHeight: 28,
  },
});
