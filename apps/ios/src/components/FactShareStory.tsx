import { LinearGradient } from "expo-linear-gradient";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { cleanFactSource } from "../lib/source";
import type { FeedFact } from "../types/domain";
import { GrummLogo } from "./GrummLogo";

type FactShareStoryProps = {
  fact: FeedFact;
};

function getGradientColors(fact: FeedFact): [string, string, string] {
  const hexColors = fact.tone.match(/#[0-9a-fA-F]{3,8}/g);

  if (hexColors && hexColors.length >= 2) {
    return [hexColors[0], hexColors[1], hexColors[2] ?? "#050812"];
  }

  return ["#07111f", fact.accent, "#050812"];
}

export const FactShareStory = forwardRef<View, FactShareStoryProps>(({ fact }, ref) => {
  const source = cleanFactSource(fact.source);

  return (
    <View ref={ref} collapsable={false} style={styles.canvas}>
      <LinearGradient colors={getGradientColors(fact)} start={{ x: 0.08, y: 0 }} end={{ x: 0.95, y: 1 }} style={styles.card}>
        <View style={styles.scrim} />
        <View style={[styles.glowTop, { backgroundColor: fact.accent }]} />
        <View style={[styles.glowBottom, { backgroundColor: fact.accent }]} />

        <View style={styles.header}>
          <View style={styles.logoMark}>
            <GrummLogo size={30} />
          </View>
          <Text style={styles.brand}>Grumm.</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.category, { borderColor: `${fact.accent}80` }]}>
            <Text style={[styles.categoryText, { color: fact.accent }]} numberOfLines={1}>
              {fact.category}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={7}>
            {fact.title}
          </Text>
          <Text style={styles.detail} numberOfLines={9}>
            {fact.detail}
          </Text>
        </View>

        <View style={styles.footer}>
          {source ? (
            <Text style={styles.source} numberOfLines={2}>
              Source : {source}
            </Text>
          ) : null}
          <Text style={styles.url}>grumm.app</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

FactShareStory.displayName = "FactShareStory";

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 58,
  },
  brand: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  canvas: {
    backgroundColor: colors.background,
    height: 640,
    width: 360,
  },
  card: {
    flex: 1,
    overflow: "hidden",
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(5,8,18,0.40)",
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 28,
    maxWidth: "86%",
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  detail: {
    color: "rgba(248,250,252,0.82)",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 27,
    marginTop: 28,
  },
  footer: {
    gap: 12,
    paddingBottom: 46,
    paddingHorizontal: 58,
  },
  glowBottom: {
    borderRadius: 999,
    bottom: -90,
    height: 260,
    left: -110,
    opacity: 0.2,
    position: "absolute",
    width: 260,
  },
  glowTop: {
    borderRadius: 999,
    height: 340,
    opacity: 0.25,
    position: "absolute",
    right: -130,
    top: -70,
    width: 340,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 42,
    paddingTop: 44,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  source: {
    color: "rgba(248,250,252,0.62)",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 43,
  },
  url: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
});
