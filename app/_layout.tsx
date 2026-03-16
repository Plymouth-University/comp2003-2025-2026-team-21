import { Stack } from "expo-router";
import { PostsProvider } from "../contexts/PostsContext";
import { TicketsProvider } from "../contexts/TicketsContext";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View, Easing, Dimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

// Reduced stars for better performance
const STAR_COUNT = 10;

// Simplified static star component
function Star({ left, size, opacity }: { left: number; size: number; opacity: number }) {
  return (
    <View
      style={[
        styles.star,
        {
          left,
          width: size,
          height: size,
          borderRadius: size,
          opacity,
        },
      ]}
    />
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  const stars = useRef(
    Array.from({ length: STAR_COUNT }).map((_, i) => ({
      id: i,
      left: Math.random() * width,
      size: 1 + Math.random() * 2.2,
      opacity: 0.25 + Math.random() * 0.45,
    }))
  ).current;

  useEffect(() => {
    // Simplified progress animation - faster startup
    Animated.timing(progressAnim, {
      toValue: 0.60,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Simplified glow - single pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      glowAnim.stopAnimation();
      progressAnim.stopAnimation();
    };
  }, [glowAnim, progressAnim]);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Reduced artificial delay for faster startup
        await new Promise((resolve) => setTimeout(resolve, 600));
      } finally {
        setAppReady(true);
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    if (!appReady) return;

    const finishSplash = async () => {
      await SplashScreen.hideAsync();

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setShowOverlay(false);
        });
      });
    };

    const timer = setTimeout(() => {
      finishSplash();
    }, 500);

    return () => clearTimeout(timer);
  }, [appReady, fadeAnim, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  if (!appReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <TicketsProvider>
        <PostsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </PostsProvider>
      </TicketsProvider>

      {showOverlay && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.starLayer}>
            {stars.map((star) => (
              <Star
                key={star.id}
                left={star.left}
                size={star.size}
                opacity={star.opacity}
              />
            ))}
          </View>

          <View style={styles.logoWrapper}>
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: glowAnim,
                  transform: [{ scale: glowAnim }],
                },
              ]}
            />

            <Image
              source={require("../assets/images/universe-splash.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: progressWidth }]} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#070B16",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 999,
  },

  starLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },

  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },

  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },

  logoGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#6FE7FF",
    opacity: 0.25,
    shadowColor: "#6FE7FF",
    shadowOpacity: 0.9,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },

  logo: {
    width: 220,
    height: 220,
  },

  barTrack: {
    width: 150,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#6FE7FF",
  },
});