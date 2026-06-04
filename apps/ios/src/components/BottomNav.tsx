import { LinearGradient } from "expo-linear-gradient";
import {
  Brain,
  Compass,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { GrummLogo } from "./GrummLogo";

export type MobileTab = "discover" | "explore" | "quizz" | "profile";

export type NavVariant =
  | "minimal-premium"
  | "tiktok-like"
  | "glass-compact"
  | "text-first"
  | "gradient-indicator";

// Change this constant to test another navbar variant locally.
const NAV_VARIANT: NavVariant = "gradient-indicator";

const tabs: { key: MobileTab; label: string; Icon: LucideIcon }[] = [
  { key: "discover", label: "Découvrir", Icon: Sparkles },
  { key: "explore", label: "Thèmes", Icon: Compass },
  { key: "quizz", label: "Quizz", Icon: Brain },
  { key: "profile", label: "Profil", Icon: UserRound },
];

type BottomNavProps = {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
  variant?: NavVariant;
};

export function BottomNav({
  activeTab,
  onChange,
  variant = NAV_VARIANT,
}: BottomNavProps) {
  const orderedTabs =
    variant === "tiktok-like" ? [tabs[1], tabs[0], tabs[2], tabs[3]] : tabs;
  const wrapContent = (
    <View style={[styles.wrap, styles[`${variant}Wrap`]]}>
      <View style={styles.sideItems}>
        {orderedTabs.slice(0, 2).map((tab) => (
          <NavItem
            active={activeTab === tab.key}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            tab={tab}
            variant={variant}
          />
        ))}
      </View>
      <Pressable
        accessibilityLabel="Retour à Découvrir"
        accessibilityRole="button"
        onPress={() => onChange("discover")}
        style={({ pressed }) => [styles.logoButton, pressed && styles.pressed]}
      >
        <GrummLogo size={38} />
      </Pressable>
      <View style={styles.sideItems}>
        {orderedTabs.slice(2).map((tab) => (
          <NavItem
            active={activeTab === tab.key}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            tab={tab}
            variant={variant}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.safeArea, styles[`${variant}SafeArea`]]}
    >
      {variant === "glass-compact" ? (
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.035)"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.glassShell}
        >
          {wrapContent}
        </LinearGradient>
      ) : (
        wrapContent
      )}
    </SafeAreaView>
  );
}

function NavItem({
  active,
  onPress,
  tab,
  variant,
}: {
  active: boolean;
  onPress: () => void;
  tab: { key: MobileTab; label: string; Icon: LucideIcon };
  variant: NavVariant;
}) {
  const Icon = tab.Icon;
  const isTikTokDiscover = variant === "tiktok-like" && tab.key === "discover";
  const isTextFirst = variant === "text-first";
  const isGradientIndicator = variant === "gradient-indicator";
  const isMinimalPremium = variant === "minimal-premium";
  const muted = "rgba(241,245,249,0.48)";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        styles[`${variant}Item`],
        active && styles[`${variant}ItemActive`],
        isTikTokDiscover && styles.tiktokDiscover,
        pressed && styles.pressed,
      ]}
    >
      {active && (isMinimalPremium || variant === "glass-compact") ? (
        <View style={styles.dotIndicator} />
      ) : null}
      {!isTextFirst ? (
        <Icon
          color={active ? colors.text : muted}
          size={isTikTokDiscover ? 24 : 21}
          strokeWidth={active ? 2.55 : 2.05}
        />
      ) : (
        <Icon
          color={active ? colors.text : "rgba(241,245,249,0.34)"}
          size={15}
          strokeWidth={1.9}
        />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          styles[`${variant}Label`],
          active && styles[`${variant}LabelActive`],
        ]}
      >
        {tab.label}
      </Text>
      {active && isGradientIndicator ? (
        <LinearGradient
          colors={["#ffd166", "#6ae3c0"]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.gradientIndicator}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "rgba(5,8,18,0.98)",
  },
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "visible",
  },
  sideItems: {
    flex: 1,
    flexDirection: "row",
  },
  logoButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    width: 48,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 2,
  },
  label: {
    color: "rgba(241,245,249,0.48)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  dotIndicator: {
    backgroundColor: colors.text,
    borderRadius: 999,
    height: 3,
    position: "absolute",
    top: 4,
    width: 3,
  },
  gradientIndicator: {
    borderRadius: 999,
    bottom: 3,
    height: 2,
    position: "absolute",
    width: 26,
  },
  glassShell: {
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 5,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },

  "minimal-premiumSafeArea": {
    backgroundColor: "rgba(5,8,18,0.96)",
  },
  "minimal-premiumWrap": {
    backgroundColor: "rgba(5,8,18,0.72)",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  "minimal-premiumItem": {
    minHeight: 52,
  },
  "minimal-premiumItemActive": {
    shadowColor: colors.text,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  "minimal-premiumLabel": {},
  "minimal-premiumLabelActive": {
    color: colors.text,
  },

  "tiktok-likeSafeArea": {
    backgroundColor: colors.background,
  },
  "tiktok-likeWrap": {
    backgroundColor: "rgba(5,8,18,0.98)",
    paddingHorizontal: 12,
    paddingTop: 3,
  },
  "tiktok-likeItem": {
    minHeight: 50,
  },
  "tiktok-likeItemActive": {},
  "tiktok-likeLabel": {
    fontSize: 10.5,
  },
  "tiktok-likeLabelActive": {
    color: colors.text,
  },
  tiktokDiscover: {
    minHeight: 58,
    transform: [{ translateY: -3 }],
  },

  "glass-compactSafeArea": {
    backgroundColor: colors.background,
  },
  "glass-compactWrap": {
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  "glass-compactItem": {
    minHeight: 48,
  },
  "glass-compactItemActive": {
    shadowColor: "#f4ead5",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  "glass-compactLabel": {
    fontSize: 10.5,
  },
  "glass-compactLabelActive": {
    color: colors.text,
  },

  "text-firstSafeArea": {
    backgroundColor: "rgba(5,8,18,0.98)",
  },
  "text-firstWrap": {
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  "text-firstItem": {
    gap: 2,
    minHeight: 50,
  },
  "text-firstItemActive": {},
  "text-firstLabel": {
    fontSize: 12,
    fontWeight: "900",
  },
  "text-firstLabelActive": {
    color: colors.text,
  },

  "gradient-indicatorSafeArea": {
    backgroundColor: "rgba(5,8,18,0.98)",
  },
  "gradient-indicatorWrap": {
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  "gradient-indicatorItem": {
    minHeight: 52,
    paddingBottom: 3,
  },
  "gradient-indicatorItemActive": {},
  "gradient-indicatorLabel": {
    fontSize: 11,
  },
  "gradient-indicatorLabelActive": {
    color: colors.text,
  },
});
