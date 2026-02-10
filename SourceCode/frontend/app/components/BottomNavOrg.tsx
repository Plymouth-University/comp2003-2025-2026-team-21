import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colours } from "../../lib/theme/colours";

interface Props {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TABS = [
  { key: "myEvents", label: "My Events" },
  { key: "createEvent", label: "Create Event" },
  { key: "social", label: "Social" },
];

export default function BottomNavOrg({ activeTab, onTabPress }: Props) {
  return (
    <View style={styles.bottomNav} accessibilityRole="tablist">
      {TABS.map((tab, idx) => (
        <TouchableOpacity
          key={tab.key}
          accessibilityRole="button"
          accessibilityLabel={`${tab.label} tab`}
          onPress={() => onTabPress(tab.key)}
          style={[
            styles.navButton,
            idx !== 0 && styles.navButtonSeparator,
            activeTab === tab.key && styles.navButtonActive,
          ]}
        >
          <Text
            style={[
              styles.navButtonText,
              activeTab === tab.key && styles.navButtonTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
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
