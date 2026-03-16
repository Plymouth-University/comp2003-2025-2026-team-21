import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { colours, shadows } from "../../lib/theme/colours";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "glow";
  padding?: "none" | "sm" | "md" | "lg";
}

export default function GlassCard({
  children,
  variant = "default",
  padding = "md",
}: GlassCardProps) {
  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return 12;
      case "md":
        return 16;
      case "lg":
        return 24;
      default:
        return 16;
    }
  };

  const getShadow = () => {
    switch (variant) {
      case "elevated":
        return shadows.medium;
      case "glow":
        return shadows.glow;
      default:
        return shadows.small;
    }
  };

  return (
    <View
      style={[
        styles.card,
        variant === "elevated" && styles.elevated,
        variant === "glow" && styles.glow,
        { padding: getPadding() },
        getShadow(),
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colours.border,
    overflow: "hidden",
  },
  elevated: {
    backgroundColor: colours.surfaceElevated,
    borderColor: colours.borderStrong,
  },
  glow: {
    borderColor: colours.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
});
