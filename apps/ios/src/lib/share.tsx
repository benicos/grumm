import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { FactShareStory } from "../components/FactShareStory";
import type { FeedFact } from "../types/domain";
import { getFactUrl, shareFact as shareFactLink } from "./facts";

function waitForRender() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 80);
    });
  });
}

export function useFactImageShare() {
  const storyRef = useRef<View>(null);
  const [shareTarget, setShareTarget] = useState<FeedFact | null>(null);

  const shareFactImage = useCallback(async (fact: FeedFact) => {
    setShareTarget(fact);
    await waitForRender();

    try {
      const uri = await captureRef(storyRef, {
        format: "png",
        height: 1920,
        quality: 1,
        result: "tmpfile",
        width: 1080,
      });
      const factUrl = getFactUrl(fact);

      await Share.share({
        message: factUrl,
        title: fact.title,
        url: uri,
      });
    } catch {
      if (await Sharing.isAvailableAsync()) {
        const uri = await captureRef(storyRef, {
          format: "png",
          height: 1920,
          quality: 1,
          result: "tmpfile",
          width: 1080,
        });
        await Sharing.shareAsync(uri);
        return;
      }

      await shareFactLink(fact);
    } finally {
      setShareTarget(null);
    }
  }, []);

  const shareStoryNode = useMemo(
    () => (
      <View pointerEvents="none" style={styles.hidden}>
        {shareTarget ? <FactShareStory ref={storyRef} fact={shareTarget} /> : null}
      </View>
    ),
    [shareTarget],
  );

  return { shareFactImage, shareStoryNode };
}

const styles = StyleSheet.create({
  hidden: {
    left: -10000,
    position: "absolute",
    top: 0,
  },
});
