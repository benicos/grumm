import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, ExternalLink, Heart, Share2, type LucideIcon } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isCommercialCollaborationFact } from "../lib/commercial";
import { cleanFactSource } from "../lib/source";
import { colors } from "../theme/colors";
import type { FactActions, FeedFact } from "../types/domain";

type FactCardProps = {
  actions: FactActions;
  fact: FeedFact;
  height: number;
  onShare: () => void;
  onSourcePress?: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

function getGradientColors(fact: FeedFact): [string, string, string] {
  const hexColors = fact.tone.match(/#[0-9a-fA-F]{3,8}/g);

  if (hexColors && hexColors.length >= 2) {
    return [hexColors[0], hexColors[1], hexColors[2] ?? "#050812"];
  }

  return ["#07111f", fact.accent, "#050812"];
}

export function FactCard({ actions, fact, height, onShare, onSourcePress, onToggleLike, onToggleSave }: FactCardProps) {
  const insets = useSafeAreaInsets();
  const source = cleanFactSource(fact.source);
  const sourceUrl = fact.sourceUrl?.trim();
  const isSponsored = isCommercialCollaborationFact(fact);

  return (
    <View style={[styles.page, { height }]}>
      <LinearGradient colors={getGradientColors(fact)} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 1 }} style={styles.card}>
        <View style={styles.scrim} />
        <View style={[styles.glowLarge, { backgroundColor: fact.accent }]} />
        <View style={[styles.glowSmall, { backgroundColor: fact.accent }]} />

        <View style={[styles.content, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.category, { borderColor: `${fact.accent}73` }]}>
            <Text style={[styles.categoryText, { color: fact.accent }]} numberOfLines={1}>
              {fact.category}
            </Text>
          </View>

          <View style={styles.centerContent}>
            <Text style={styles.title} numberOfLines={6}>
              {fact.title}
            </Text>
            <Text style={styles.detail} numberOfLines={8}>
              {fact.detail}
            </Text>
          </View>

          <View style={styles.bottomContent}>
            {isSponsored ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  if (sourceUrl) {
                    Linking.openURL(sourceUrl);
                  }
                }}
                style={({ pressed }) => [styles.sponsoredButton, pressed && styles.pressed]}
              >
                <Text style={styles.sponsoredButtonText}>En savoir plus</Text>
                <ExternalLink color="#07111f" size={15} strokeWidth={2.4} />
              </Pressable>
            ) : (
              <View style={styles.actions}>
                <ActionButton accent={fact.accent} active={actions.liked} Icon={Heart} label="Aimer" onPress={onToggleLike} />
                <ActionButton accent={fact.accent} active={actions.saved} Icon={Bookmark} label="Enregistrer" onPress={onToggleSave} />
                <ActionButton accent={fact.accent} Icon={Share2} label="Partager" onPress={onShare} />
              </View>
            )}

            {source ? (
              sourceUrl ? (
                <Pressable
                  onPress={() => {
                    if (!isSponsored) {
                      onSourcePress?.();
                    }
                    Linking.openURL(sourceUrl);
                  }}
                  style={styles.sourceLink}
                >
                  <Text style={styles.source} numberOfLines={1}>
                    {isSponsored ? "Partenaire" : "Source"} : {source}
                  </Text>
                  <ExternalLink color="rgba(248,250,252,0.58)" size={13} strokeWidth={2.2} />
                </Pressable>
              ) : (
                <Text style={styles.source} numberOfLines={1}>
                  {isSponsored ? "Partenaire" : "Source"} : {source}
                </Text>
              )
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function ActionButton({
  active = false,
  accent,
  Icon,
  label,
  onPress,
}: {
  accent: string;
  active?: boolean;
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { shadowColor: active ? accent : "#000" },
        active && styles.actionButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={active ? [colors.accent, "#ffe4a1"] : ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.055)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionGradient}
      >
        <Icon
          color={active ? "#06111d" : colors.text}
          fill={active ? colors.accent : "transparent"}
          size={23}
          strokeWidth={2.15}
        />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
    shadowColor: "#000",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  actionButtonActive: {
    borderColor: "rgba(255,255,255,0.38)",
    shadowOpacity: 0.34,
  },
  actionGradient: {
    alignItems: "center",
    borderRadius: 999,
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  bottomContent: {
    gap: 14,
  },
  card: {
    flex: 1,
    overflow: "hidden",
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(5,8,18,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "72%",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 0,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  detail: {
    color: "rgba(248,250,252,0.80)",
    fontSize: 17,
    lineHeight: 26,
    marginTop: 20,
  },
  glowLarge: {
    borderRadius: 999,
    height: 360,
    opacity: 0.24,
    position: "absolute",
    right: -120,
    top: -70,
    width: 360,
  },
  glowSmall: {
    borderRadius: 999,
    bottom: 80,
    height: 240,
    left: -120,
    opacity: 0.16,
    position: "absolute",
    width: 240,
  },
  page: {
    backgroundColor: colors.background,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  source: {
    color: "rgba(248,250,252,0.58)",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  sourceLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  sponsoredButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#fff",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  sponsoredButtonText: {
    color: "#07111f",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 33,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
  },
});
