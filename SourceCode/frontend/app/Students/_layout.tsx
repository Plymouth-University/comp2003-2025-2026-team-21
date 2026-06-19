import React, { useMemo, useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { registerForPushNotifications } from "../../lib/notifications";
import { fetchConversations } from "../../lib/messagesApi";
import { useSocket } from "../hooks/useSocket";
import BottomNavStudent from "../components/BottomNavStudent";

export default function StudentsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useSocket();

  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.error("Push registration error:", err),
    );
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const convs = await fetchConversations();
      const total = convs.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCount(total);
    } catch {
      // ignore — badge just won't update
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUnread();
    });
    return () => sub.remove();
  }, [refreshUnread]);

  const activeTab = useMemo(() => {
    if (pathname.includes("EventFeed")) return "events";
    if (pathname.includes("myTickets")) return "tickets";
    if (pathname.includes("socialStudent")) return "social";
    if (pathname.includes("messages") || pathname.includes("conversation"))
      return "messages";
    return null;
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "events") return "/Students/EventFeed";
    if (tab === "tickets") return "/Students/myTickets";
    if (tab === "social") return "/Students/socialStudent";
    if (tab === "messages") return "/Students/messages";
    return "/Students/EventFeed";
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <BottomNavStudent
          activeTab={activeTab}
          unreadMessageCount={unreadCount}
          onTabPress={(tab) => {
            if (tab === activeTab && tab !== "messages") {
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
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
    </Tabs>
  );
}
