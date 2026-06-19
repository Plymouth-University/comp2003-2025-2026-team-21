import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { colours } from "../../lib/theme/colours";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  activeTab: string | null;
  onTabPress: (tab: string) => void;
  unreadMessageCount?: number;
}

const TABS = [
  { key: "events", label: "Events", icon: "calendar" as const },
  { key: "tickets", label: "Tickets", icon: "ticket" as const },
  { key: "social", label: "Social", icon: "people" as const },
  { key: "messages", label: "Messages", icon: "chatbubble" as const },
];

export default function BottomNavStudent({
  activeTab,
  onTabPress,
  unreadMessageCount = 0,
}: Props) {
  const scalesRef = useRef<Record<string, Animated.Value>>({});

  const scales = useMemo(() => {
    const next: Record<string, Animated.Value> = {};
    for (const tab of TABS) {
      next[tab.key] = scalesRef.current[tab.key] ?? new Animated.Value(1);
    }
    scalesRef.current = next;
    return next;
  }, []);

  const pressIn = (key: string) => {
    Animated.spring(scales[key], {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const pressOut = (key: string) => {
    Animated.spring(scales[key], {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handlePress = async (key: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(key);
  };

  return (
    <View style={styles.bottomNav} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} tab`}
            onPress={() => handlePress(tab.key)}
            onPressIn={() => pressIn(tab.key)}
            onPressOut={() => pressOut(tab.key)}
            style={styles.navButton}
          >
            <Animated.View
              style={[
                styles.tabContent,
                { transform: [{ scale: scales[tab.key] }] },
                isActive && styles.activeTabContent,
              ]}
            >
              <Ionicons
                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? colours.primary : colours.textMuted}
              />
              <Text
                style={[
                  styles.navButtonText,
                  isActive && styles.navButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
              {tab.key === "messages" && unreadMessageCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colours.surface,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    height: 70,
    paddingBottom: 8,
    paddingTop: 6,
  },

  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tabContent: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },

  activeTabContent: {
    backgroundColor: colours.glass,
  },

  navButtonText: {
    color: colours.textMuted,
    fontWeight: "600",
    fontSize: 11,
  },

  navButtonTextActive: {
    color: colours.primary,
    fontWeight: "700",
  },

  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.primary,
    position: "absolute",
    bottom: -2,
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 10,
    backgroundColor: colours.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
