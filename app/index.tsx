import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import * as SecureStore from "expo-secure-store";
import { colours } from "../lib/theme/colours";
import ThemedButton from "./components/ThemedButton";
import CosmicBackground from "./components/CosmicBackground";



export default function Index() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
  Asset.fromModule(require("../assets/images/Space.png")).downloadAsync();
}, []);

  useEffect(() => {
    let active = true;

    const tryAutoLogin = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        if (!token) return;

        // call a lightweight endpoint to confirm the token is still valid.
        // the helper will clear session on failure so we don't need to
        // duplicate that logic here.
        try {
          await import("../lib/postsApi").then((m) => m.getCurrentUser());
        } catch (err) {
          // if the call failed because the token expired the helper already
          // cleared the session; bail out and show the login screen.
          return;
        }

        const role =
          (await SecureStore.getItemAsync("userRole")) ||
          (await SecureStore.getItemAsync("role"));

        if (!active) return;

        if (role === "ORGANISATION") {
          router.replace("/Organisations/eventsOrg");
        } else {
          router.replace("/Students/EventFeed");
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    tryAutoLogin();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <ImageBackground
      source={require("../assets/images/Space.png")}
      style={styles.container}
      imageStyle={{ resizeMode: "cover" }}
    >
      <CosmicBackground />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.content} edges={["top"]}>
        {checkingAuth ? null : (
          <>
            <Text style={styles.title}>UniVerse</Text>
            <Text style={styles.subtitle}>Choose how you want to sign in</Text>

            <View style={styles.buttonContainer}>
              <ThemedButton
                title="Login as Student"
                onPress={() => router.push("../auth/loginStudent")}
                variant="success"
                size="large"
                fullWidth
                glow
              />
            </View>

            <View style={styles.buttonContainer}>
              <ThemedButton
                title="Login as Organisation"
                onPress={() => router.push("../auth/loginOrg")}
                variant="primary"
                size="large"
                fullWidth
                glow
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.65)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 64,
    fontWeight: "900",
    color: colours.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: colours.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: colours.textSecondary,
    marginBottom: 56,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
});