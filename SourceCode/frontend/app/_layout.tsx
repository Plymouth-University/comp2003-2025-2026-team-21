import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import { View } from "react-native";
import { PostsProvider } from "./contexts/PostsContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        // preload important images here
        await Asset.loadAsync([
          require("../assets/images/Space.png"),
        ]);
      } catch (err) {
        console.warn("Asset loading error:", err);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    }

    loadAssets();
  }, []);

  if (!ready) {
    return <View />;
  }

  return (
    <PostsProvider>
      <Slot />
    </PostsProvider>
  );
}
