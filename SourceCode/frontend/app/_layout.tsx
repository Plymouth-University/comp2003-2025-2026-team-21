import { Stack } from "expo-router";
import { PostsProvider } from "../contexts/PostsContext";
import { TicketsProvider } from "../contexts/TicketsContext";
import React from "react";

export default function RootLayout() {
  return (
    <TicketsProvider>
      <PostsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </PostsProvider>
    </TicketsProvider>
  );
}