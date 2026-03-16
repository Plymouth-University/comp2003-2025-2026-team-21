import React, { useEffect, useMemo } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";
import { colours } from "../../lib/theme/colours";

const { width, height } = Dimensions.get("window");

// Reduced star count for better performance
const STAR_COUNT = 30;

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export default function CosmicBackground() {
  // Memoize stars so they're only created once
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  // Simple static stars - no animation loop
  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colours.backgroundDeep,
  },
  star: {
    position: "absolute",
    backgroundColor: colours.textPrimary,
  },
});