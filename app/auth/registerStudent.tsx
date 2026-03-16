import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../lib/api";
import ThemedInput from "../components/ThemedInput";
import ThemedButton from "../components/ThemedButton";
import CosmicBackground from "../components/CosmicBackground";
import { colours, spacing, borderRadius } from "../../lib/theme/colours";

export default function RegisterStudent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const isValidStudentEmail = (value: string) =>
    value.toLowerCase().endsWith("@students.plymouth.ac.uk");

  const isStrongPassword = (value: string) =>
    value.length >= 8 && /\d/.test(value);

  const registerRequest = async (emailValue: string, usernameValue: string, passwordValue: string) => {
    const url = `${API_URL}/auth/register-student`;
    console.log("Calling backend:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailValue,
        username: usernameValue,
        password: passwordValue,
        name: "Student",
      }),
    });

    const raw = await response.text();

    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || `Registration failed (HTTP ${response.status})`
      );
    }

    if (!data?.token || !data?.user) {
      throw new Error("Registration response missing token/user");
    }

    return data as {
      token: string;
      user: { id: string; email: string; username: string; role: string; name?: string };
    };
  };

  const validateForm = () => {
    const newErrors = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    };

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!isValidStudentEmail(trimmedEmail)) {
      newErrors.email = "Must be a @students.plymouth.ac.uk email";
    }

    if (!trimmedUsername) {
      newErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      newErrors.username = "Only letters, numbers, and underscores";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isStrongPassword(password)) {
      newErrors.password = "Min 8 characters with at least 1 number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    setLoading(true);

    try {
      const { token, user } = await registerRequest(trimmedEmail, trimmedUsername, password);

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);
      await SecureStore.setItemAsync("username", user.username);
      await SecureStore.setItemAsync("userRole", user.role);
      await SecureStore.setItemAsync("role", user.role);

      Alert.alert("Success", "Account created successfully!");
      router.replace("/Students/EventFeed");
    } catch (err: any) {
      Alert.alert("Registration failed", err?.message || "Please try again.");
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the UniVerse community</Text>

          <ThemedInput
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (errors.username) setErrors({ ...errors, username: "" });
            }}
            autoCapitalize="none"
            error={errors.username}
          />

          <ThemedInput
            label="Student Email"
            placeholder="yourname@students.plymouth.ac.uk"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <ThemedInput
            label="Create Password"
            placeholder="Minimum 8 characters"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            secureTextEntry
            error={errors.password}
          />

          <ThemedInput
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
            }}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <View style={styles.buttonContainer}>
            <ThemedButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              variant="primary"
              size="large"
              fullWidth
              glow
            />
          </View>

          <TouchableOpacity onPress={() => router.back()} disabled={loading}>
            <Text style={styles.loginText}>Back to Login</Text>
          </TouchableOpacity>
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
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.65)",
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
  buttonContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    width: "100%",
  },
  loginText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colours.textSecondary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});