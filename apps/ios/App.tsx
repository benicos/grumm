import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, InteractionManager, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomTabs, type MobileTab } from "./src/components/BottomTabs";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import {
  endMobileAnalyticsSession,
  setMobileAnalyticsEnabled,
  setMobileAnalyticsUserId,
  trackMobileAnalyticsEvent,
  trackMobilePageView,
} from "./src/lib/analytics";
import { AuthScreen } from "./src/screens/AuthScreen";
import { FeedScreen, type FeedSystemBarTheme } from "./src/screens/FeedScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { QuizScreen } from "./src/screens/QuizScreen";
import { ThemesScreen } from "./src/screens/ThemesScreen";
import { appTheme } from "./src/theme/appTheme";
import type { CategorySummary } from "./src/types/domain";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GrummMobileApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function GrummMobileApp() {
  const [activeTab, setActiveTab] = useState<MobileTab>("feed");
  const [feedSystemBarTheme, setFeedSystemBarTheme] = useState<FeedSystemBarTheme>({
    backgroundColor: "#172033",
    style: "light",
  });
  const [selectedTheme, setSelectedTheme] = useState<Pick<CategorySummary, "name" | "slug"> | null>(null);
  const { isLoading, profile, session } = useAuth();
  const openedRef = useRef(false);

  function changeTab(tab: MobileTab) {
    setActiveTab(tab);
  }

  function openTheme(theme: CategorySummary) {
    setSelectedTheme({ name: theme.name, slug: theme.slug });
    setActiveTab("feed");
  }

  function clearTheme() {
    setSelectedTheme(null);
    setActiveTab("feed");
  }

  useEffect(() => {
    if (isLoading || !session) {
      return;
    }

    const shouldTrack = profile?.role !== "administrateur";

    void (async () => {
      await setMobileAnalyticsEnabled(shouldTrack);
      await setMobileAnalyticsUserId(shouldTrack ? session.user.id : null);

      if (!shouldTrack || openedRef.current) {
        return;
      }

      openedRef.current = true;
      InteractionManager.runAfterInteractions(() => {
        void trackMobileAnalyticsEvent({
          eventName: "app_opened",
          metadata: { surface: "ios" },
        });
      });
    })();
  }, [isLoading, profile?.role, session]);

  useEffect(() => {
    if (!isLoading && session && profile?.role !== "administrateur") {
      const task = InteractionManager.runAfterInteractions(() => {
        void trackMobilePageView(activeTab).catch(() => undefined);
      });

      return () => task.cancel();
    }

    return undefined;
  }, [activeTab, isLoading, profile?.role, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void endMobileAnalyticsSession();
      }
    });

    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.authGate}>
        <StatusBar style="dark" />
        <ActivityIndicator color={appTheme.color.teal} size="large" />
        <Text style={styles.authGateText}>Préparation de Grumm...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <AuthScreen />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        backgroundColor={activeTab === "feed" ? feedSystemBarTheme.backgroundColor : appTheme.color.background}
        style={activeTab === "feed" ? feedSystemBarTheme.style : "dark"}
        translucent={false}
      />
      <View style={styles.screen}>
        {activeTab === "feed" ? (
          <FeedScreen
            onClearTheme={clearTheme}
            onRequireAuth={() => setActiveTab("profile")}
            onSystemBarChange={setFeedSystemBarTheme}
            themeName={selectedTheme?.name}
            themeSlug={selectedTheme?.slug}
          />
        ) : null}
        {activeTab === "themes" ? <ThemesScreen onOpenTheme={openTheme} /> : null}
        {activeTab === "quiz" ? <QuizScreen /> : null}
        {activeTab === "profile" ? (
          <ProfileScreen
            onOpenFeed={() => setActiveTab("feed")}
            onOpenQuiz={() => setActiveTab("quiz")}
            onOpenThemes={() => setActiveTab("themes")}
          />
        ) : null}
      </View>
      <BottomTabs activeTab={activeTab} onChange={changeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  authGate: {
    alignItems: "center",
    backgroundColor: appTheme.color.background,
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  authGateText: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  root: {
    backgroundColor: appTheme.color.background,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});
