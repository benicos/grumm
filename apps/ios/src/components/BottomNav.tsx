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
          <GrummLogo size={48} />
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
    borderRadius: 18,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 2,
  },
  itemActive: {
    backgroundColor: "rgba(255,255,255,0.075)",
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
    width: 58,
  },
  pressed: {
    opacity: 0.72,
  },
  safeArea: {
    backgroundColor: "rgba(5,8,18,0.86)",
    borderTopColor: "rgba(255,255,255,0.10)",
    borderTopWidth: 1,
  },
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
});
