import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { API_URL } from "../../lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const url = `${API_URL}/auth/login`;
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

  const userLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Please fill in both fields.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await loginRequest(email.trim(), password);

      console.log("Login successful, user data:", {
        id: user.id,
        username: user.username,
        email: user.email,
      });

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);

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
      <View style={styles.overlay} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>

        <Text style={styles.label}>Enter email address</Text>
        <TextInput
          style={styles.input}
          placeholder="johnsmith@email.com"
          placeholderTextColor="#b5b5b5"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Enter password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password123"
          placeholderTextColor="#b5b5b5"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.rememberRow}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: "#ccc", true: "#00c853" }}
            thumbColor="#fff"
          />
          <Text style={styles.rememberText}>Remember me</Text>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={userLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.signupText}>
          Not a user? Create account{" "}
          <Text style={styles.link} onPress={() => router.push("/Students/registerStudent")}>
            here
          </Text>
        </Text>
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
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  backIcon: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 40,
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
    marginBottom: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#000",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  rememberText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#fff",
  },
  loginBtn: {
    backgroundColor: "#00c853",
    width: 140,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  signupText: {
    marginTop: 15,
    fontSize: 14,
    color: "#fff",
  },
  link: {
    color: "#7a46ff",
    textDecorationLine: "underline",
  },
});