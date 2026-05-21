import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Compass, Sparkles, UserRound, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { GrummLogo } from "./GrummLogo";

export type MobileTab = "discover" | "explore" | "saved" | "profile";

const tabs: { key: MobileTab; label: string; Icon: LucideIcon }[] = [
  { key: "discover", label: "Découvrir", Icon: Sparkles },
  { key: "explore", label: "Explorer", Icon: Compass },
  { key: "saved", label: "Enregistrés", Icon: Bookmark },
  { key: "profile", label: "Profil", Icon: UserRound },
];

type BottomNavProps = {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
};

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <LinearGradient
        colors={["rgba(9,18,32,0.82)", "rgba(7,17,31,0.66)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wrap}
      >
        {tabs.slice(0, 2).map((tab) => (
          <NavItem active={activeTab === tab.key} key={tab.key} tab={tab} onPress={() => onChange(tab.key)} />
        ))}

        <View pointerEvents="none" style={styles.logoSlot}>
          <View style={styles.logoHalo} />
          <LinearGradient colors={["rgba(255,209,102,0.28)", "rgba(106,227,192,0.12)"]} style={styles.logoPedestal}>
            <GrummLogo size={48} />
          </LinearGradient>
        </View>

        {tabs.slice(2).map((tab) => (
          <NavItem active={activeTab === tab.key} key={tab.key} tab={tab} onPress={() => onChange(tab.key)} />
        ))}
      </LinearGradient>
    </SafeAreaView>
  );
}

function NavItem({
  active,
  onPress,
  tab,
}: {
  active: boolean;
  onPress: () => void;
  tab: { key: MobileTab; label: string; Icon: LucideIcon };
}) {
  const Icon = tab.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
    >
      {active ? <View style={styles.activeGlow} /> : null}
      <Icon color={active ? colors.text : "rgba(241,245,249,0.58)"} size={21} strokeWidth={2.25} />
      <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: 2,
  },
  itemActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    shadowColor: colors.accent,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  activeGlow: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 3,
    position: "absolute",
    top: 6,
    width: 20,
  },
  label: {
    color: "rgba(241,245,249,0.58)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  labelActive: {
    color: colors.text,
  },
  logoSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
  },
  logoHalo: {
    backgroundColor: "rgba(255,209,102,0.16)",
    borderRadius: 999,
    height: 66,
    position: "absolute",
    shadowColor: colors.accent,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    width: 66,
  },
  logoPedestal: {
    alignItems: "center",
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  safeArea: {
    backgroundColor: "transparent",
  },
  wrap: {
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    gap: 5,
    marginBottom: 8,
    marginHorizontal: 12,
    marginTop: 6,
    overflow: "visible",
    padding: 7,
    shadowColor: "#000",
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 30,
  },
});
