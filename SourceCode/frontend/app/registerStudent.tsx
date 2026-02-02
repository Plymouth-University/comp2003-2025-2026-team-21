import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../lib/api";

export default function RegisterStudent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidStudentEmail = (value: string) =>
    value.toLowerCase().endsWith("@students.plymouth.ac.uk");

  const isStrongPassword = (value: string) =>
    value.length >= 8 && /\d/.test(value);

  const registerRequest = async (emailValue: string, usernameValue: string, passwordValue: string) => {
    const url = `${API_URL}/auth/register`;
    console.log("Calling backend:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Student",
        email: emailValue,
        username: usernameValue,
        password: passwordValue,
        role: "STUDENT",
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

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !trimmedUsername || !password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    if (!isValidStudentEmail(trimmedEmail)) {
      Alert.alert(
        "Invalid Email",
        "You must use a valid @students.plymouth.ac.uk email address."
      );
      return;
    }

    if (trimmedUsername.length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username must be at least 3 characters long."
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert(
        "Invalid Username",
        "Username can only contain letters, numbers, and underscores."
      );
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters and contain a number."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await registerRequest(trimmedEmail, trimmedUsername, password);

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("username", user.username);

      Alert.alert("Success", "Account created successfully!");
      router.replace("/EventFeed");
    } catch (err: any) {
      Alert.alert("Registration failed", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/Space.png")}
      style={styles.container}
      imageStyle={{ resizeMode: "cover" }}
    >
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Choose a username"
          placeholderTextColor="#b5b5b5"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>Student Email</Text>
        <TextInput
          style={styles.input}
          placeholder="yourname@students.plymouth.ac.uk"
          placeholderTextColor="#b5b5b5"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Create Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          placeholderTextColor="#b5b5b5"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor="#b5b5b5"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.loginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#fff",
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#e5e5e5",
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#000",
  },
  registerBtn: {
    backgroundColor: "#7a46ff",
    width: 180,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  registerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loginText: {
    marginTop: 20,
    fontSize: 14,
    color: "#fff",
    textDecorationLine: "underline",
  },
});