import React, { useMemo } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import BottomNavOrg from "../components/BottomNavOrg";

export default function OrganisationsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = useMemo(() => {
    if (pathname.includes("eventsOrg")) return "myEvents";
    if (pathname.includes("createEvent")) return "createEvent";
    if (pathname.includes("socialOrg")) return "social";
    return "myEvents";
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "myEvents") return "/Organisations/eventsOrg";
    if (tab === "createEvent") return "/Organisations/createEvent";
    if (tab === "social") return "/Organisations/socialOrg";
    return "/Organisations/eventsOrg";
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => (
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
      )}
    >
      <Tabs.Screen name="eventsOrg" options={{ href: null }} />
      <Tabs.Screen name="createEvent" options={{ href: null }} />
      <Tabs.Screen name="socialOrg" options={{ href: null }} />
      <Tabs.Screen name="profileOrg" options={{ href: null }} />
    </Tabs>
  );
}