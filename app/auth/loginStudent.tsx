import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Switch,
  ImageBackground,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { API_URL } from "../../lib/api";
import { clearCurrentUserCache } from "../../lib/postsApi";
import { clearSession } from "../../lib/auth";
import ThemedInput from "../components/ThemedInput";
import ThemedButton from "../components/ThemedButton";
import CosmicBackground from "../components/CosmicBackground";
import { colours, spacing, borderRadius } from "../../lib/theme/colours";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const loadRememberedUser = async () => {
      try {
        const storedEmail = await SecureStore.getItemAsync("userEmail");
        const storedPassword = await SecureStore.getItemAsync("userPassword");

        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
        }
      } catch {}
    };

    loadRememberedUser();
  }, []);

  const loginRequest = async (email: string, password: string) => {
    const url = `${API_URL}/auth/login-student`;
    console.log("Calling backend:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const raw = await response.text();
    console.log("Raw response:", raw.substring(0, 500));

    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
        console.log("Parsed response user data:", data.user);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || `Login failed (HTTP ${response.status})`
      );
    }

    if (!data?.token || !data?.user) {
      throw new Error("Login response missing token/user");
    }

    return data as {
      token: string;
      user: {
        id: string;
        email: string;
        role: string;
        name?: string;
        username?: string;
      };
    };
  };

  const validateForm = () => {
    let isValid = true;

    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const userLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await loginRequest(email.trim(), password);

      // wipe anything that might be left from a previous session
      await clearSession();
      clearCurrentUserCache();

      console.log("Login successful, user data:", {
        id: user.id,
        username: user.username,
        email: user.email,
      });

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);
      await SecureStore.setItemAsync("userRole", user.role);
      await SecureStore.setItemAsync("role", user.role);

      if (user.username) {
        await SecureStore.setItemAsync("username", user.username);
        console.log("Stored username in SecureStore:", user.username);
      } else {
        console.warn("Warning: No username in login response");
      }

      if (rememberMe) {
        await SecureStore.setItemAsync("userEmail", email.trim());
        await SecureStore.setItemAsync("userPassword", password);
      } else {
        await SecureStore.deleteItemAsync("userEmail");
        await SecureStore.deleteItemAsync("userPassword");
      }

      if (user.role === "ORGANISATION") {
        router.push("/Students/EventFeed");
      } else {
        router.push("/Students/EventFeed");
      }
    } catch (err: any) {
      Alert.alert("Login failed", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/Space.png")}
      style={styles.container}
      imageStyle={{ resizeMode: "cover" }}
    >
      <CosmicBackground />
      <View style={styles.overlay} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <ThemedInput
            label="Email address"
            placeholder="johnsmith@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
            keyboardType="email-address"
            error={emailError}
          />

          <ThemedInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
            secureTextEntry
            error={passwordError}
          />

          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: colours.border, true: colours.success }}
              thumbColor="#fff"
            />
            <Text style={styles.rememberText}>Remember me</Text>
          </View>

          <View style={styles.buttonContainer}>
            <ThemedButton
              title="Login"
              onPress={userLogin}
              loading={loading}
              variant="success"
              size="large"
              fullWidth
              glow
            />
          </View>

          <Text style={styles.signupText}>
            Not a user? Create account{" "}
            <Text style={styles.link} onPress={() => router.push("../auth/registerStudent")}>
              here
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "stretch",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.huge,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.65)",
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: colours.border,
  },
  backIcon: {
    color: colours.textPrimary,
    fontSize: 32,
    lineHeight: 32,
    marginTop: -2,
    fontWeight: "900",
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: spacing.sm,
    color: colours.textPrimary,
    textShadowColor: colours.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colours.textSecondary,
    marginBottom: spacing.xxxl,
    letterSpacing: 0.3,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  rememberText: {
    marginLeft: spacing.md,
    fontSize: 15,
    color: colours.textSecondary,
    fontWeight: "600",
  },
  buttonContainer: {
    width: "100%",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  signupText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colours.textSecondary,
    fontWeight: "600",
  },
  link: {
    color: colours.primary,
    textDecorationLine: "underline",
    fontWeight: "700",
  },
});