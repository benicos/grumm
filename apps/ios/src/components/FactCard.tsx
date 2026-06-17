import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, ExternalLink, Heart, SquareArrowUp } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { cleanFactSource } from "../lib/source";
import { getThemeIconName } from "../lib/themeIcons";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { FactActions, FeedFact } from "../types/domain";
import { ThemeIcon } from "./ThemeIcon";

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

type FactLength = "long" | "medium" | "short";

function getFactLength(title: string, detail: string, expanded: boolean): FactLength {
  const score = title.trim().length * 1.35 + detail.trim().length;

  if (expanded || score > 430) {
    return "long";
  }

  if (score > 230) {
    return "medium";
  }

  return "short";
}

function getImmersiveDetailLines(length: FactLength, expanded: boolean) {
  if (expanded) {
    return undefined;
  }

  return length === "short" ? 9 : length === "medium" ? 8 : 7;
}

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
  const longContent = fact.longContent?.trim() || null;
  const hasMore = Boolean(longContent && longContent !== fact.detail.trim());
  const body = expanded ? fact.longContent ?? fact.detail : fact.detail;
  const isImmersive = immersive;
  const themeIconName = getThemeIconName(fact.categorySlug, fact.themeIcon);
  const factLength = getFactLength(fact.title, body, expanded);

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
      <View style={[styles.contentZone, isImmersive && styles.immersiveContentZone]}>
        <View
          style={[
            styles.textBlock,
            isImmersive && styles.immersiveTextBlock,
            isImmersive && factLength === "short" && styles.immersiveTextBlockShort,
            isImmersive && factLength === "medium" && styles.immersiveTextBlockMedium,
            isImmersive && factLength === "long" && styles.immersiveTextBlockLong,
          ]}
        >
          <View style={[styles.topRow, isImmersive && styles.immersiveTopRow]}>
            <View
              style={[
                styles.badge,
                { backgroundColor: withAlpha(fact.accent, isImmersive ? 0.22 : 0.14) },
                isImmersive && styles.immersiveBadge,
              ]}
            >
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: withAlpha(fact.accent, isImmersive ? 0.2 : 0.12) },
                ]}
              >
                <ThemeIcon
                  color={isImmersive ? "#ffffff" : fact.accent}
                  name={themeIconName}
                  size={13}
                  strokeWidth={2.5}
                />
              </View>
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

          <Text
            style={[
              styles.title,
              immersive && styles.immersiveTitle,
              isImmersive && factLength === "long" && styles.immersiveTitleLong,
            ]}
          >
            {fact.title}
          </Text>
          <Text
            numberOfLines={immersive ? getImmersiveDetailLines(factLength, expanded) : expanded ? undefined : 4}
            style={[
              styles.detail,
              immersive && styles.immersiveDetail,
              isImmersive && factLength === "short" && styles.immersiveDetailShort,
              isImmersive && factLength === "long" && styles.immersiveDetailLong,
            ]}
          >
            {body}
          </Text>

        {hasMore && !expanded ? (
          <Pressable
            accessibilityRole="button"
            onPress={onReadMore}
            style={[
              styles.readMore,
              isImmersive && styles.immersiveReadMore,
              isImmersive && factLength === "long" && styles.immersiveReadMoreLong,
              isImmersive
                ? {
                    backgroundColor: withAlpha(fact.accent, 0.22),
                    borderColor: "rgba(255,255,255,0.22)",
                  }
                : {
                    backgroundColor: withAlpha(fact.accent, 0.1),
                    borderColor: withAlpha(fact.accent, 0.22),
                  },
            ]}
          >
            <Text
              style={[
                styles.readMoreText,
                { color: isImmersive ? "#ffffff" : fact.accent },
              ]}
            >
              En apprendre plus
            </Text>
          </Pressable>
        ) : null}
      </View>
      </View>

      <View style={[styles.bottomZone, isImmersive && styles.immersiveBottomZone]}>
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
                color={isImmersive ? "rgba(255,255,255,0.72)" : appTheme.color.muted}
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
          <IconAction accent={fact.accent} Icon={SquareArrowUp} label="Partager" onPress={onShare} />
        </View>
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
        size={22}
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
    gap: 12,
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
  badgeIcon: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 22,
    justifyContent: "center",
    width: 22,
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
  bottomZone: {
    gap: 13,
    marginTop: 12,
  },
  contentZone: {
    minWidth: 0,
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
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  iconPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  immersiveActions: {
    justifyContent: "center",
  },
  immersiveBottomZone: {
    gap: 14,
    marginTop: 0,
    paddingBottom: 6,
  },
  immersiveBadge: {
    borderColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
  },
  immersiveCard: {
    backgroundColor: "#172033",
    flex: 1,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  immersiveContentZone: {
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    paddingBottom: 18,
    paddingTop: 12,
  },
  immersiveDetail: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 13,
  },
  immersiveDetailLong: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  immersiveDetailShort: {
    lineHeight: 26,
  },
  immersiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  immersiveSource: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12.5,
  },
  immersiveTextBlock: {
    justifyContent: "center",
    minHeight: 0,
  },
  immersiveTextBlockLong: {
    justifyContent: "flex-start",
  },
  immersiveTextBlockMedium: {
    justifyContent: "center",
  },
  immersiveTextBlockShort: {
    justifyContent: "center",
  },
  immersiveTitle: {
    color: "#ffffff",
    fontSize: 27,
    lineHeight: 34,
    marginTop: 17,
  },
  immersiveTitleLong: {
    fontSize: 25,
    lineHeight: 31,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  readMore: {
    alignSelf: "flex-start",
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  immersiveReadMore: {
    marginTop: 14,
  },
  immersiveReadMoreLong: {
    marginTop: 10,
  },
  readMoreText: {
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
  immersiveTopRow: {
    justifyContent: "flex-start",
  },
});
