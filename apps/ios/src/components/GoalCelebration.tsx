import { LinearGradient } from "expo-linear-gradient";
import { Check, Flame } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

const particles = [
  { x: -116, y: -124, size: 7, delay: 40, color: "#ffd166" },
  { x: -78, y: -164, size: 5, delay: 150, color: "#6ae3c0" },
  { x: -36, y: -128, size: 6, delay: 90, color: "#ffffff" },
  { x: 42, y: -156, size: 5, delay: 190, color: "#ffb3bd" },
  { x: 98, y: -116, size: 7, delay: 110, color: "#ffd166" },
  { x: -98, y: 116, size: 5, delay: 220, color: "#6ae3c0" },
  { x: 86, y: 110, size: 6, delay: 260, color: "#ffffff" },
];

type GoalCelebrationProps = {
  completedGoals: number;
  message: string;
  visible: boolean;
};

export function GoalCelebration({ completedGoals, message, visible }: GoalCelebrationProps) {
  const entrance = useMemo(() => new Animated.Value(0), []);
  const particleProgress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      particleProgress.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.sequence([
        Animated.timing(entrance, {
          duration: 560,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entrance, {
          delay: 980,
          duration: 360,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(particleProgress, {
        duration: 1650,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entrance, particleProgress, visible]);

  if (!visible) {
    return null;
  }

  const cardScale = entrance.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.9, 1.035, 1],
  });
  const cardTranslate = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: entrance }]} />

      {particles.map((particle, index) => {
        const translateY = particleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.y],
        });
        const translateX = particleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.x],
        });
        const opacity = particleProgress.interpolate({
          inputRange: [0, 0.18, 0.82, 1],
          outputRange: [0, 0.9, 0.75, 0],
        });

        return (
          <Animated.View
            key={`${particle.x}-${particle.y}-${index}`}
            style={[
              styles.particle,
              {
                backgroundColor: particle.color,
                height: particle.size,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate: `${index * 24}deg` }],
                width: particle.size,
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.card,
          {
            opacity: entrance,
            transform: [{ translateY: cardTranslate }, { scale: cardScale }],
          },
        ]}
      >
        <LinearGradient colors={["rgba(255,209,102,0.24)", "rgba(106,227,192,0.08)", "rgba(7,17,31,0.94)"]} style={styles.cardGradient}>
          <View style={styles.halo} />
          <View style={styles.iconWrap}>
            <Flame color="#06111d" fill={colors.accent} size={34} strokeWidth={2.35} />
          </View>
          <Text style={styles.eyebrow}>Objectif atteint</Text>
          <Text style={styles.title}>{message}</Text>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [
                    {
                      scaleX: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.08, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <View style={styles.countRow}>
            <Check color={colors.cyan} size={16} strokeWidth={2.4} />
            <Text style={styles.countText}>{completedGoals} objectif{completedGoals > 1 ? "s" : ""} validé{completedGoals > 1 ? "s" : ""}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  card: {
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 318,
    overflow: "hidden",
    shadowColor: colors.accent,
    shadowOffset: { height: 20, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 46,
    width: "82%",
  },
  cardGradient: {
    alignItems: "center",
    padding: 24,
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
  },
  countText: {
    color: "rgba(248,250,252,0.68)",
    fontSize: 13,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 16,
    textTransform: "uppercase",
  },
  halo: {
    backgroundColor: "rgba(255,209,102,0.24)",
    borderRadius: 999,
    height: 132,
    position: "absolute",
    top: -58,
    width: 132,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 28,
    width: 72,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  particle: {
    borderRadius: 999,
    position: "absolute",
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: "100%",
    transformOrigin: "left",
    width: "100%",
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 6,
    marginTop: 20,
    overflow: "hidden",
    width: "100%",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 32,
    marginTop: 8,
    textAlign: "center",
  },
});
