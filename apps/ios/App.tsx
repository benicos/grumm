import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, InteractionManager, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomNav, type MobileTab } from "./src/components/BottomNav";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import {
  endMobileAnalyticsSession,
  setMobileAnalyticsEnabled,
  setMobileAnalyticsUserId,
  trackMobileAnalyticsEvent,
  trackMobilePageView,
} from "./src/lib/analytics";
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { ExploreScreen } from "./src/screens/ExploreScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { QuizzScreen } from "./src/screens/QuizzScreen";
import { colors } from "./src/theme/colors";
import type { FeedFact } from "./src/types/domain";

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
  const [activeTab, setActiveTab] = useState<MobileTab>("discover");
  const [discoverSeedFact, setDiscoverSeedFact] = useState<FeedFact | null>(null);
  const [discoverThemeSlug, setDiscoverThemeSlug] = useState<string | null>(null);
  const [memoryStartSignal, setMemoryStartSignal] = useState(0);
  const { isLoading, profile, session } = useAuth();
  const openedRef = useRef(false);

  function changeTab(tab: MobileTab) {
    if (tab === "discover") {
      setDiscoverSeedFact(null);
      setDiscoverThemeSlug(null);
    }

    setActiveTab(tab);
  }

  function openFactInDiscover(fact: FeedFact) {
    setDiscoverSeedFact(fact);
    setActiveTab("discover");
  }

  function openThemeInDiscover(themeSlug: string) {
    setDiscoverSeedFact(null);
    setDiscoverThemeSlug(themeSlug);
    setActiveTab("discover");
  }

  function openMemoryChallenge() {
    setMemoryStartSignal((value) => value + 1);
    setActiveTab("quizz");
  }

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const shouldTrack = profile?.role !== "administrateur";

    void (async () => {
      await setMobileAnalyticsEnabled(shouldTrack);
      await setMobileAnalyticsUserId(shouldTrack ? session?.user.id ?? null : null);

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
  }, [isLoading, profile?.role, session?.user.id]);

  useEffect(() => {
    if (!isLoading && profile?.role !== "administrateur") {
      const task = InteractionManager.runAfterInteractions(() => {
        void trackMobilePageView(activeTab).catch(() => undefined);
      });

      return () => task.cancel();
    }
  }, [activeTab, isLoading, profile?.role]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void endMobileAnalyticsSession();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
        <View style={styles.root}>
          <StatusBar style="light" />
          <View style={styles.screen}>
            {activeTab === "discover" ? (
              <DiscoverScreen
                initialFact={discoverSeedFact}
                onRequireAuth={() => setActiveTab("profile")}
                themeSlug={discoverThemeSlug}
              />
            ) : null}
            {activeTab === "explore" ? (
              <ExploreScreen
                onOpenDiscover={() => setActiveTab("discover")}
                onOpenFact={openFactInDiscover}
                onOpenTheme={openThemeInDiscover}
              />
            ) : null}
            {activeTab === "quizz" ? (
              <QuizzScreen
                memoryStartSignal={memoryStartSignal}
                onMemoryStartHandled={() => setMemoryStartSignal(0)}
              />
            ) : null}
            {activeTab === "profile" ? <ProfileScreen onOpenMemoryChallenge={openMemoryChallenge} /> : null}
          </View>
          <BottomNav activeTab={activeTab} onChange={changeTab} />
        </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
});
