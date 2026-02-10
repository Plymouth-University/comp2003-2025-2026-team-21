import { Stack } from "expo-router";
import { PostsProvider } from "../contexts/PostsContext";
import React from "react";

export default function RootLayout() {
  return (
    <PostsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PostsProvider>
  );
}