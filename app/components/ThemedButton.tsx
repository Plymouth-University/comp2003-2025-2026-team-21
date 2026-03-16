import React, { useRef, useCallback, useMemo } from "react";
import { Text, StyleSheet, Animated, ActivityIndicator, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { colours, shadows } from "../../lib/theme/colours";

type ButtonVariant = "primary" | "secondary" | "success" | "ghost" | "gradient";
type ButtonSize = "small" | "medium" | "large";

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  glow?: boolean;
}

export default React.memo(function ThemedButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  hapticFeedback = true,
  glow = false,
}: ThemedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    if (hapticFeedback && !disabled && !loading) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [hapticFeedback, disabled, loading, onPress]);

  const getBackgroundColor = () => {
    if (disabled) return colours.surfaceElevated;
    switch (variant) {
      case "primary":
        return colours.primary;
      case "secondary":
        return colours.secondary;
      case "success":
        return colours.success;
      case "ghost":
        return "transparent";
      case "gradient":
        // Use primary as base for gradient variant
        return colours.primary;
      default:
        return colours.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colours.textMuted;
    return colours.textPrimary;
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { height: 40, paddingHorizontal: 16 };
      case "medium":
        return { height: 50, paddingHorizontal: 24 };
      case "large":
        return { height: 56, paddingHorizontal: 32 };
      default:
        return { height: 50, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 15;
      case "medium":
        return 17;
      case "large":
        return 19;
      default:
        return 17;
    }
  };

  const getShadow = () => {
    if (disabled || !glow) return {};
    // Custom glow based on variant
    const glowColor = variant === "secondary" ? colours.secondary : colours.primary;
    return {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    };
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? "100%" : "auto" }}>
      <Pressable
        style={[
          styles.button,
          sizeStyles,
          {
            backgroundColor: getBackgroundColor(),
            borderWidth: variant === "ghost" ? 1.5 : 0,
            borderColor: variant === "ghost" ? colours.border : "transparent",
          },
          getShadow(),
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  text: {
    fontWeight: "700",
    textAlign: "center",
  },
});