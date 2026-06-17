import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpenText,
  Brain,
  Grid2X2,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { appTheme } from "../theme/appTheme";

export type MobileTab = "feed" | "themes" | "quiz" | "profile";

const tabs: { Icon: LucideIcon; key: MobileTab; label: string }[] = [
  { Icon: BookOpenText, key: "feed", label: "Feed" },
  { Icon: Grid2X2, key: "themes", label: "Explorer" },
  { Icon: Brain, key: "quiz", label: "Quiz" },
  { Icon: UserRound, key: "profile", label: "Profil" },
];

type BottomTabsProps = {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
};

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.shell}>
        {tabs.map((tab) => (
          <TabButton
            active={activeTab === tab.key}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            tab={tab}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  onPress,
  tab,
}: {
  active: boolean;
  onPress: () => void;
  tab: { Icon: LucideIcon; key: MobileTab; label: string };
}) {
  const Icon = tab.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      {active ? (
        <LinearGradient
          colors={appTheme.gradient.activeTab}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.activeIcon}
        >
          <Icon color="#ffffff" size={20} strokeWidth={2.35} />
        </LinearGradient>
      ) : (
        <View style={styles.idleIcon}>
          <Icon color={appTheme.color.muted} size={20} strokeWidth={2.1} />
        </View>
      )}
      <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 30,
    justifyContent: "center",
    width: 42,
  },
  idleIcon: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 42,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  label: {
    color: appTheme.color.muted,
    fontSize: 10.5,
    fontWeight: appTheme.weight.semibold,
    letterSpacing: 0,
  },
  labelActive: {
    color: appTheme.color.ink,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.97 }],
  },
  safeArea: {
    backgroundColor: appTheme.color.card,
  },
  shell: {
    alignItems: "center",
    backgroundColor: appTheme.color.card,
    borderTopColor: appTheme.color.border,
    borderTopWidth: 1,
    borderColor: appTheme.color.border,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: 6,
    paddingTop: 0,
  },
});
