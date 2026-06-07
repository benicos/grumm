import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, ExternalLink, Heart, Share2 } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { cleanFactSource } from "../lib/source";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { FactActions, FeedFact } from "../types/domain";

type FactCardProps = {
  actions: FactActions;
  expanded?: boolean;
  fact: FeedFact;
  height?: number;
  immersive?: boolean;
  onReadMore?: () => void;
  onShare: () => void;
  onSourcePress?: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onView?: () => void;
};

export function FactCard({
  actions,
  expanded = false,
  fact,
  immersive = false,
  onReadMore,
  onShare,
  onSourcePress,
  onToggleLike,
  onToggleSave,
  onView,
}: FactCardProps) {
  const source = cleanFactSource(fact.source);
  const hasMore = Boolean(fact.longContent && fact.longContent !== fact.detail);
  const body = expanded ? fact.longContent ?? fact.detail : fact.detail;
  const isImmersive = immersive;

  return (
    <Pressable
      accessibilityRole={onView ? "button" : undefined}
      onPress={onView}
      style={({ pressed }) => [
        isImmersive ? styles.immersiveCard : styles.card,
        !isImmersive && { borderColor: withAlpha(fact.accent, 0.24) },
        pressed && onView ? styles.pressed : null,
      ]}
    >
      {isImmersive ? (
        <>
          <LinearGradient
            colors={getGradientColors(fact)}
            end={{ x: 1, y: 1 }}
            start={{ x: 0.05, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.immersiveOverlay} />
        </>
      ) : (
        <View style={[styles.accentWash, { backgroundColor: withAlpha(fact.accent, 0.11) }]} />
      )}
      <View style={styles.topRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: withAlpha(fact.accent, isImmersive ? 0.22 : 0.14) },
            isImmersive && styles.immersiveBadge,
          ]}
        >
          <View style={[styles.badgeDot, { backgroundColor: fact.accent }]} />
          <Text
            numberOfLines={1}
            style={[
              styles.badgeText,
              { color: isImmersive ? "#ffffff" : fact.accent },
            ]}
          >
            {fact.category}
          </Text>
        </View>
      </View>

      <View style={[styles.textBlock, immersive && styles.immersiveTextBlock]}>
        <Text style={[styles.title, immersive && styles.immersiveTitle]}>{fact.title}</Text>
        <Text
          numberOfLines={expanded ? undefined : immersive ? 7 : 4}
          style={[styles.detail, immersive && styles.immersiveDetail]}
        >
          {body}
        </Text>

        {hasMore && !expanded ? (
          <Pressable accessibilityRole="button" onPress={onReadMore} style={styles.readMore}>
            <Text style={styles.readMoreText}>Lire plus</Text>
          </Pressable>
        ) : null}
      </View>

      {source ? (
        fact.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              onSourcePress?.();
              void Linking.openURL(fact.sourceUrl ?? "");
            }}
            style={styles.sourceLink}
          >
            <Text numberOfLines={1} style={[styles.source, isImmersive && styles.immersiveSource]}>
              Source : {source}
            </Text>
            <ExternalLink
              color={isImmersive ? "rgba(255,255,255,0.70)" : appTheme.color.muted}
              size={13}
              strokeWidth={2.2}
            />
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.source, isImmersive && styles.immersiveSource]}>
            Source : {source}
          </Text>
        )
      ) : null}

      <View style={[styles.actions, immersive && styles.immersiveActions]}>
        <IconAction
          active={actions.liked}
          accent={fact.accent}
          Icon={Heart}
          label="Aimer"
          onPress={onToggleLike}
        />
        <IconAction
          active={actions.saved}
          accent={fact.accent}
          Icon={Bookmark}
          label="Enregistrer"
          onPress={onToggleSave}
        />
        <IconAction accent={fact.accent} Icon={Share2} label="Partager" onPress={onShare} />
      </View>
    </Pressable>
  );
}

function getGradientColors(fact: FeedFact): [string, string, string] {
  const hexColors = fact.tone.match(/#[0-9a-fA-F]{3,8}/g);

  if (hexColors && hexColors.length >= 2) {
    return [hexColors[0], hexColors[1], hexColors[2] ?? fact.accent];
  }

  return ["#172033", fact.accent, "#0f172a"];
}

function IconAction({
  accent,
  active = false,
  Icon,
  label,
  onPress,
}: {
  accent: string;
  active?: boolean;
  Icon: typeof Heart;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: withAlpha(accent, 0.15), borderColor: withAlpha(accent, 0.34) },
        pressed && styles.iconPressed,
      ]}
    >
      <Icon
        color={active ? accent : appTheme.color.ink}
        fill={active ? withAlpha(accent, 0.22) : "transparent"}
        size={20}
        strokeWidth={2.25}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accentWash: {
    borderRadius: 120,
    height: 190,
    position: "absolute",
    right: -80,
    top: -84,
    width: 190,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  badge: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    maxWidth: "82%",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  badgeDot: {
    borderRadius: appTheme.radius.pill,
    height: 8,
    width: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: appTheme.color.cardSoft,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    ...appTheme.shadow.card,
  },
  detail: {
    color: appTheme.color.muted,
    fontSize: 15,
    fontWeight: appTheme.weight.medium,
    lineHeight: 22,
    marginTop: 10,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  immersiveActions: {
    justifyContent: "center",
  },
  immersiveBadge: {
    borderColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
  },
  immersiveCard: {
    backgroundColor: "#172033",
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  immersiveDetail: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    lineHeight: 24,
  },
  immersiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  immersiveSource: {
    color: "rgba(255,255,255,0.70)",
  },
  immersiveTextBlock: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 14,
  },
  immersiveTitle: {
    color: "#ffffff",
    fontSize: 27,
    lineHeight: 33,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  readMore: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 4,
  },
  readMoreText: {
    color: appTheme.color.ink,
    fontSize: 13,
    fontWeight: appTheme.weight.bold,
  },
  source: {
    color: appTheme.color.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: appTheme.weight.medium,
  },
  sourceLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 21,
    fontWeight: appTheme.weight.bold,
    lineHeight: 26,
    marginTop: 14,
  },
  textBlock: {
    minWidth: 0,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
