import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { colours } from "../../lib/theme/colours";

interface Props {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TABS = [
  { key: "events", label: "Events" },
  { key: "tickets", label: "Tickets" },
  { key: "social", label: "Social" },
];

export default function BottomNavStudent({ activeTab, onTabPress }: Props) {
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
      toValue: 0.96,
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
    await Haptics.selectionAsync();
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
            <Animated.View style={{ transform: [{ scale: scales[tab.key] }] }}>
              <Text
                style={[styles.navButtonText, isActive && styles.navButtonTextActive]}
              >
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
    height: 64,
    paddingVertical: 0,
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
  },

  navButtonActive: {
    backgroundColor: colours.surfaceElevated,
  },

  navButtonText: {
    color: colours.textMuted,
    fontWeight: "600",
  },

  navButtonTextActive: {
    color: colours.textPrimary,
  },

  navButtonSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: colours.border,
  },
});