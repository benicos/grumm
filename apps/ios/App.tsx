import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
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
import { SavedScreen } from "./src/screens/SavedScreen";
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
  const { isLoading, profile, session } = useAuth();
  const openedRef = useRef(false);

  function changeTab(tab: MobileTab) {
    if (tab === "discover") {
      setDiscoverSeedFact(null);
    }

    setActiveTab(tab);
  }

  function openFactInDiscover(fact: FeedFact) {
    setDiscoverSeedFact(fact);
    setActiveTab("discover");
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
      await trackMobileAnalyticsEvent({
        eventName: "app_opened",
        metadata: { surface: "ios" },
      });
    })();
  }, [isLoading, profile?.role, session?.user.id]);

  useEffect(() => {
    if (!isLoading && profile?.role !== "administrateur") {
      void trackMobilePageView(activeTab).catch(() => undefined);
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
              <DiscoverScreen initialFact={discoverSeedFact} onRequireAuth={() => setActiveTab("profile")} />
            ) : null}
            {activeTab === "explore" ? (
              <ExploreScreen
                onOpenDiscover={() => setActiveTab("discover")}
                onOpenFact={openFactInDiscover}
              />
            ) : null}
            {activeTab === "saved" ? (
              <SavedScreen onRequireAuth={() => setActiveTab("profile")} />
            ) : null}
            {activeTab === "profile" ? <ProfileScreen /> : null}
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
