import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Use the native-stack animation options exposed by expo-router's Stack
        // 'fade' gives a simple cross-fade between screens instead of sliding.
        animation: 'fade',
        animationDuration: 300,
      }}
    />
  );
}
