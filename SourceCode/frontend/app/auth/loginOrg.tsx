import React, { useState, useEffect } from "react";
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
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { API_URL } from "../../lib/api";

export default function LoginOrganisation() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRememberedUser = async () => {
      try {
        const storedEmail = await SecureStore.getItemAsync("orgEmail");
        const storedPassword = await SecureStore.getItemAsync("orgPassword");

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
        data?.error || data?.message || `Login failed (HTTP ${response.status})`
      );
    }

    if (!data?.token || !data?.user) {
      throw new Error("Login response missing token/user");
    }

    return data as {
      token: string;
      user: { id: string; email: string; role: string; name?: string; username?: string };
    };
  };

  const orgLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Please fill in both fields.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await loginRequest(email.trim(), password);

      if (user.role !== "ORGANISATION") {
        Alert.alert("Access denied", "This account is not an organisation.");
        return;
      }

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);

      if (user.username) {
        await SecureStore.setItemAsync("username", user.username);
      }

      if (rememberMe) {
        await SecureStore.setItemAsync("orgEmail", email.trim());
        await SecureStore.setItemAsync("orgPassword", password);
      } else {
        await SecureStore.deleteItemAsync("orgEmail");
        await SecureStore.deleteItemAsync("orgPassword");
      }

      router.push("/Organisations/eventsOrg");
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
        <Text style={styles.title}>Organisation</Text>

        <Text style={styles.label}>Enter email address</Text>
        <TextInput
          style={styles.input}
          placeholder="org@email.com"
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setRememberMe((v) => !v)}
            style={[styles.rememberPill, rememberMe && styles.rememberPillOn]}
          >
            <Text style={[styles.rememberPillText, rememberMe && styles.rememberPillTextOn]}>
              Remember me
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={orgLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Login</Text>}
        </TouchableOpacity>

        <Text style={styles.signupText}>
          Need an account?{" "}
          <Text style={styles.link} onPress={() => router.push("../auth/registerOrg")}>
            Register
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
  rememberPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
  },
  rememberPillOn: {
    backgroundColor: "rgba(0,200,83,0.35)",
    borderWidth: 1,
    borderColor: "rgba(0,200,83,0.55)",
  },
  rememberPillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rememberPillTextOn: {
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