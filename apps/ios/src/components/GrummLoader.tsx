import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { GrummLogo } from "./GrummLogo";

type GrummLoaderProps = {
  label?: string;
};

export function GrummLoader({ label = "Chargement de Grumm." }: GrummLoaderProps) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <LinearGradient colors={["#050812", "#07111f", "#101b2c"]} style={styles.root}>
      <View style={styles.glow} />
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <GrummLogo size={64} />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderRadius: 999,
    height: 210,
    position: "absolute",
    top: "34%",
    width: 210,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 20,
  },
  logoWrap: {
    shadowColor: colors.accent,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 28,
  },
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 28,
  },
});
