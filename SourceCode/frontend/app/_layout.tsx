import { Stack } from "expo-router";
import React, { useState } from "react";


export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
