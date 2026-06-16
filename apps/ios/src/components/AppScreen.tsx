import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { appTheme } from "../theme/appTheme";

type AppScreenProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  topSafeAreaColor?: string;
};

export function AppScreen({
  children,
  contentStyle,
  scroll = false,
  style,
  topSafeAreaColor,
}: AppScreenProps) {
  return (
    <LinearGradient
      colors={appTheme.gradient.screen}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.root, style]}
    >
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safeArea,
          topSafeAreaColor ? { backgroundColor: topSafeAreaColor } : null,
        ]}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: appTheme.space.gutter,
  },
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: appTheme.space.xl,
    paddingHorizontal: appTheme.space.gutter,
  },
});
