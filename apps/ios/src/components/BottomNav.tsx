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
      <View style={styles.wrap}>
        {tabs.slice(0, 2).map((tab) => (
          <NavItem active={activeTab === tab.key} key={tab.key} tab={tab} onPress={() => onChange(tab.key)} />
        ))}

        <View pointerEvents="none" style={styles.logoSlot}>
          <View style={styles.logoHalo} />
          <LinearGradient colors={["rgba(244,234,213,0.16)", "rgba(255,255,255,0.04)"]} style={styles.logoPedestal}>
            <GrummLogo size={40} />
          </LinearGradient>
        </View>

        {tabs.slice(2).map((tab) => (
          <NavItem active={activeTab === tab.key} key={tab.key} tab={tab} onPress={() => onChange(tab.key)} />
        ))}
      </View>
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
      <Icon color={active ? colors.text : "rgba(241,245,249,0.44)"} size={21} strokeWidth={active ? 2.55 : 2.1} />
      <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 2,
  },
  itemActive: {
    shadowColor: colors.accent,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  activeGlow: {
    backgroundColor: colors.text,
    borderRadius: 999,
    height: 2,
    position: "absolute",
    top: 3,
    width: 18,
  },
  label: {
    color: "rgba(241,245,249,0.46)",
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
    width: 58,
  },
  logoHalo: {
    backgroundColor: "rgba(244,234,213,0.08)",
    borderRadius: 999,
    height: 54,
    position: "absolute",
    shadowColor: "#f4ead5",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    width: 54,
  },
  logoPedestal: {
    alignItems: "center",
    borderRadius: 17,
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
    width: 46,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  safeArea: {
    backgroundColor: colors.background,
  },
  wrap: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.94)",
    flexDirection: "row",
    gap: 2,
    overflow: "visible",
    paddingHorizontal: 10,
    paddingTop: 5,
  },
});
