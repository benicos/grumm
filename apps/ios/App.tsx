import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomNav, type MobileTab } from "./src/components/BottomNav";
import { AuthProvider } from "./src/context/AuthContext";
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { ExploreScreen } from "./src/screens/ExploreScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SavedScreen } from "./src/screens/SavedScreen";
import { colors } from "./src/theme/colors";
import type { FeedFact } from "./src/types/domain";

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>("discover");
  const [discoverSeedFact, setDiscoverSeedFact] = useState<FeedFact | null>(null);

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

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <StatusBar style="light" />
          <View style={styles.screen}>
            {activeTab === "discover" ? (
              <DiscoverScreen initialFact={discoverSeedFact} onRequireAuth={() => setActiveTab("profile")} />
            ) : null}
            {activeTab === "explore" ? <ExploreScreen onOpenFact={openFactInDiscover} /> : null}
            {activeTab === "saved" ? (
              <SavedScreen onRequireAuth={() => setActiveTab("profile")} />
            ) : null}
            {activeTab === "profile" ? <ProfileScreen /> : null}
          </View>
          <BottomNav activeTab={activeTab} onChange={changeTab} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
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
