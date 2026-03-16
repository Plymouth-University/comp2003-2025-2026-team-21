import React, { useMemo } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import BottomNavStudent from "../components/BottomNavStudent";

export default function StudentsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = useMemo(() => {
    if (pathname.includes("EventFeed")) return "events";
    if (pathname.includes("myTickets")) return "tickets";
    if (pathname.includes("socialStudent")) return "social";
    return "events";
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "events") return "/Students/EventFeed";
    if (tab === "tickets") return "/Students/myTickets";
    if (tab === "social") return "/Students/socialStudent";
    return "/Students/EventFeed";
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => (
        <BottomNavStudent
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
      <Tabs.Screen name="EventFeed" options={{ href: null }} />
      <Tabs.Screen name="myTickets" options={{ href: null }} />
      <Tabs.Screen name="socialStudent" options={{ href: null }} />
      <Tabs.Screen name="profileStudent" options={{ href: null }} />
      <Tabs.Screen name="profileOrg" options={{ href: null }} />
    </Tabs>
  );
}