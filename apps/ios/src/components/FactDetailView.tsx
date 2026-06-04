import { Bookmark, ChevronLeft, ExternalLink, Heart, Share2, type LucideIcon } from "lucide-react-native";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cleanFactSource } from "../lib/source";
import { designTokens as ds } from "../theme/designTokens";
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

export function FactDetailView({ actions, fact, onBack, onShare, onToggleLike, onToggleSave }: FactDetailViewProps) {
  const insets = useSafeAreaInsets();
  const source = cleanFactSource(fact.source);
  const sourceUrl = fact.sourceUrl?.trim();

  return (
    <SwipeBackView onBack={onBack} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={ds.color.text} size={20} strokeWidth={2.4} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={[styles.category, { borderColor: `${fact.accent}66` }]}>
          <Text style={[styles.categoryText, { color: fact.accent }]} numberOfLines={1}>
            {fact.category}
          </Text>
        </View>

        <Text style={styles.title}>{fact.title}</Text>
        <Text style={styles.detail}>{fact.detail}</Text>

        {fact.hook ? (
          <>
            <Text style={styles.sectionTitle}>À retenir</Text>
            <View style={styles.card}>
              <Text style={styles.hook}>{fact.hook}</Text>
            </View>
          </>
        ) : null}

        {fact.longContent ? (
          <>
            <Text style={styles.sectionTitle}>En savoir plus</Text>
            <View style={styles.card}>
              <Text style={styles.longContentText}>{fact.longContent}</Text>
            </View>
          </>
        ) : null}

        {source ? (
          <>
            <Text style={styles.sectionTitle}>Source</Text>
            <View style={styles.card}>
              {sourceUrl ? (
                <Pressable onPress={() => Linking.openURL(sourceUrl)} style={styles.sourceLink}>
                  <Text style={styles.sourceText}>{source}</Text>
                  <ExternalLink color={ds.color.muted} size={15} strokeWidth={2.2} />
                </Pressable>
              ) : (
                <Text style={styles.sourceText}>{source}</Text>
              )}
            </View>
          </>
        ) : null}

        <View style={styles.actions}>
          <ActionButton active={actions.liked} Icon={Heart} label="Aimer" onPress={onToggleLike} />
          <ActionButton active={actions.saved} Icon={Bookmark} label="Garder" onPress={onToggleSave} />
          <ActionButton Icon={Share2} label="Partager" onPress={onShare} />
        </View>
      </ScrollView>
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
      <Icon color={active ? "#06111d" : ds.color.text} fill={active ? ds.color.goal : "transparent"} size={21} strokeWidth={2.2} />
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.control,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 64,
  },
  actionButtonActive: {
    backgroundColor: ds.color.goal,
    borderColor: "rgba(255,255,255,0.28)",
  },
  actionLabel: {
    color: ds.color.muted,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.semibold,
  },
  actionLabelActive: {
    color: "#06111d",
  },
  actions: {
    flexDirection: "row",
    gap: ds.space.sm,
    marginTop: ds.space.sm,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  backText: {
    color: ds.color.text,
    fontSize: 13,
    fontWeight: ds.weight.semibold,
  },
  card: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    padding: ds.space.md,
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: ds.color.card,
    borderRadius: ds.radius.full,
    borderWidth: 1,
    marginTop: ds.space.md,
    maxWidth: "78%",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: ds.typography.small,
    fontWeight: ds.weight.bold,
    textTransform: "uppercase",
  },
  content: {
    gap: ds.space.md,
    paddingBottom: 30,
    paddingHorizontal: ds.space.gutter,
  },
  detail: {
    color: ds.color.muted,
    fontSize: 17,
    lineHeight: 27,
  },
  hook: {
    color: ds.color.text,
    fontSize: 17,
    fontWeight: ds.weight.semibold,
    lineHeight: 25,
  },
  longContentText: {
    color: "rgba(248,250,252,0.82)",
    fontSize: 16,
    lineHeight: 27,
  },
  pressed: {
    opacity: 0.78,
  },
  root: {
    backgroundColor: ds.color.background,
    flex: 1,
  },
  sectionTitle: {
    color: ds.color.text,
    fontSize: ds.typography.section,
    fontWeight: ds.weight.semibold,
    marginTop: ds.space.xs,
  },
  sourceLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  sourceText: {
    color: ds.color.muted,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: ds.weight.medium,
    lineHeight: 20,
  },
  title: {
    color: ds.color.text,
    fontSize: 34,
    fontWeight: ds.weight.bold,
    lineHeight: 39,
  },
});
