import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { colours } from "../../lib/theme/colours";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  activeTab: string | null;
  onTabPress: (tab: string) => void;
}

const TABS = [
  { key: "myEvents", label: "My Events", icon: "calendar" as const },
  { key: "createEvent", label: "Create", icon: "add-circle" as const },
  { key: "social", label: "Social", icon: "people" as const },
];

export default function BottomNavOrg({ activeTab, onTabPress }: Props) {
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
      {TABS.map((tab, idx) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} tab`}
            onPress={() => handlePress(tab.key)}
            onPressIn={() => pressIn(tab.key)}
            onPressOut={() => pressOut(tab.key)}
            style={[
              styles.navButton,
              idx !== 0 && styles.navButtonSeparator,
              isActive && styles.navButtonActive,
            ]}
          >
            <Animated.View style={{ transform: [{ scale: scales[tab.key] }], alignItems: "center" }}>
              <Ionicons
                name={isActive ? tab.icon : (tab.icon + "-outline") as any}
                size={24}
                color={isActive ? colours.textPrimary : colours.textMuted}
              />
              <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                {tab.label}
              </Text>
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
    borderTopWidth: 1,
    backgroundColor: colours.surface,
    borderTopColor: colours.border,
    height: 72,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },

  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    borderRadius: 0,
    marginHorizontal: 0,
    backgroundColor: "transparent",
    gap: 4,
  },

  navButtonActive: {
    backgroundColor: colours.surfaceElevated,
  },

  navButtonText: {
    color: colours.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },

  navButtonTextActive: {
    color: colours.textPrimary,
    fontWeight: "800",
  },

  navButtonSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: colours.border,
  },
});