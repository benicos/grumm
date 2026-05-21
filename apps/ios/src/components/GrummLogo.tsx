import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

export function GrummLogo({ size = 46 }: { size?: number }) {
  return (
    <View style={[styles.shadow, { height: size, width: size }]}>
      <LinearGradient
        colors={["#ffd166", "#6ae3c0"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.43) }]}>G</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: {
    color: "#06111d",
    fontWeight: "900",
    letterSpacing: 0,
  },
  logo: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  shadow: {
    borderRadius: 999,
    shadowColor: colors.accent,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
  },
});
