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

const API_URL =
  "https://bookish-chainsaw-jj49r95xvj9h5x7x-3001.app.github.dev/auth";

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
      } catch (error) {
        console.error("Error loading remembered user:", error);
      }
    };

    loadRememberedUser();
  }, []);

  const loginRequest = async (email: string, password: string) => {
    console.log("Calling backend:", `${API_URL}/login`);

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Login response status:", response.status, "body:", data);

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    return data as {
      token: string;
      user: { id: string; email: string; role: string; name?: string };
    };
  };

  // Login function
  const userLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Please fill in both fields.");
      return;
    }

    setLoading(true);

    try {
      // Real backend auth
      const { token, user } = await loginRequest(email, password);

      // Save JWT token
      await SecureStore.setItemAsync("authToken", token);

      // Save or clear credentials based on rememberMe toggle
      if (rememberMe) {
        await SecureStore.setItemAsync("userEmail", email);
        await SecureStore.setItemAsync("userPassword", password);
      } else {
        await SecureStore.deleteItemAsync("userEmail");
        await SecureStore.deleteItemAsync("userPassword");
      }

      // Navigate based on role
      if (user.role === "ORGANISATION") {
        router.push("/EventFeed"); // adjust route if needed
      } else {
        router.push("/EventFeed");
      }
    } catch (err: any) {
      Alert.alert("Login failed", err.message || "Please try again.");
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

        <TouchableOpacity style={styles.loginBtn} onPress={userLogin}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.signupText}>
  Not a user? Create account{" "}
  <Text style={styles.link} onPress={() => router.push("/registerStudent")}>
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
