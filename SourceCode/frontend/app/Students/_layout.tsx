import React from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import BottomNav from "../components/BottomNav";

export default function StudentsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab =
    pathname.includes("EventFeed")
      ? "events"
      : pathname.includes("myTickets")
      ? "tickets"
      : pathname.includes("socialStudent")
      ? "social"
      : "events";

  const routeForTab = (tab: string) => {
    if (tab === "events") return "/Students/EventFeed";
    if (tab === "tickets") return "/Students/myTickets";
    if (tab === "social") return "/Students/socialStudent";
    return "/Students/EventFeed";
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          if (tab === activeTab) {
            router.setParams({ _r: Date.now().toString() });
            return;
          }

          router.replace(routeForTab(tab) as any);
        }}
      />
    </View>
  );
}