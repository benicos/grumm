import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, ChevronLeft, ExternalLink, Heart, Share2, type LucideIcon } from "lucide-react-native";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { cleanFactSource } from "../lib/source";
import type { FactActions, FeedFact } from "../types/domain";
import { SwipeBackView } from "./SwipeBackView";

type FactDetailViewProps = {
  actions: FactActions;
  fact: FeedFact;
  onBack: () => void;
  onShare: () => void;
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

export function FactDetailView({ actions, fact, onBack, onShare, onToggleLike, onToggleSave }: FactDetailViewProps) {
  const insets = useSafeAreaInsets();
  const source = cleanFactSource(fact.source);
  const sourceUrl = fact.sourceUrl?.trim();

  return (
    <SwipeBackView onBack={onBack} style={styles.root}>
    <LinearGradient colors={getGradientColors(fact)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={styles.scrim} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={20} strokeWidth={2.4} />
          <Text style={styles.backText}>Enregistrés</Text>
        </Pressable>

        <View style={[styles.category, { borderColor: `${fact.accent}73` }]}>
          <Text style={[styles.categoryText, { color: fact.accent }]} numberOfLines={1}>
            {fact.category}
          </Text>
        </View>

        <Text style={styles.title}>{fact.title}</Text>
        <Text style={styles.detail}>{fact.detail}</Text>

        {fact.longContent ? (
          <View style={styles.longContent}>
            <Text style={styles.longContentLabel}>En savoir plus</Text>
            <Text style={styles.longContentText}>{fact.longContent}</Text>
          </View>
        ) : null}

        {fact.hook ? (
          <View style={styles.takeaway}>
            <Text style={styles.takeawayLabel}>À retenir</Text>
            <Text style={styles.hook}>{fact.hook}</Text>
          </View>
        ) : null}

        {source ? (
          <View style={styles.sourceBlock}>
            <Text style={styles.sourceLabel}>Source</Text>
            {sourceUrl ? (
              <Pressable onPress={() => Linking.openURL(sourceUrl)} style={styles.sourceLink}>
                <Text style={styles.sourceText}>{source}</Text>
                <ExternalLink color="rgba(248,250,252,0.72)" size={15} strokeWidth={2.2} />
              </Pressable>
            ) : (
              <Text style={styles.sourceText}>{source}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.actions}>
          <ActionButton active={actions.liked} Icon={Heart} label="Aimer" onPress={onToggleLike} />
          <ActionButton active={actions.saved} Icon={Bookmark} label="Garder" onPress={onToggleSave} />
          <ActionButton Icon={Share2} label="Partager" onPress={onShare} />
        </View>
      </ScrollView>
    </LinearGradient>
    </SwipeBackView>
  );
}

function ActionButton({
  active = false,
  Icon,
  label,
  onPress,
}: {
  active?: boolean;
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, active && styles.actionButtonActive, pressed && styles.pressed]}>
      <Icon color={active ? "#06111d" : colors.text} fill={active ? colors.accent : "transparent"} size={22} strokeWidth={2.2} />
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 68,
  },
  actionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: "rgba(255,255,255,0.38)",
  },
  actionLabel: {
    color: "rgba(248,250,252,0.74)",
    fontSize: 12,
    fontWeight: "900",
  },
  actionLabelActive: {
    color: "#06111d",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(5,8,18,0.36)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(5,8,18,0.36)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 20,
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  content: {
    gap: 22,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  detail: {
    color: "rgba(248,250,252,0.80)",
    fontSize: 17,
    lineHeight: 27,
  },
  hook: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 25,
    marginTop: 7,
  },
  longContent: {
    backgroundColor: "rgba(5,8,18,0.24)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  longContentLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  longContentText: {
    color: "rgba(248,250,252,0.82)",
    fontSize: 16,
    lineHeight: 27,
    marginTop: 10,
  },
  pressed: {
    opacity: 0.76,
  },
  root: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  sourceBlock: {
    backgroundColor: "rgba(5,8,18,0.34)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sourceLabel: {
    color: "rgba(248,250,252,0.46)",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sourceLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  sourceText: {
    color: "rgba(248,250,252,0.76)",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  takeaway: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  takeawayLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 42,
  },
});
