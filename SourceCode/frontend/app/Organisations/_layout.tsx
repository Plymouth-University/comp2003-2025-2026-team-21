import React from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import BottomNavOrg from "../components/BottomNavOrg";

export default function OrganisationsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab =
    pathname.includes("eventsOrg")
      ? "myEvents"
      : pathname.includes("createEvent")
      ? "createEvent"
      : pathname.includes("socialOrg")
      ? "social"
      : "myEvents";

  const routeForTab = (tab: string) => {
    if (tab === "myEvents") return "/Organisations/eventsOrg";
    if (tab === "createEvent") return "/Organisations/createEvent";
    if (tab === "social") return "/Organisations/socialOrg";
    return "/Organisations/eventsOrg";
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNavOrg
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