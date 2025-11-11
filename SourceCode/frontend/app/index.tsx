import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadRememberedUser = async () => {
      const storedEmail = await SecureStore.getItemAsync("userEmail");
      const storedPassword = await SecureStore.getItemAsync("userPassword");
      if (storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRememberMe(true);
      }
    };
    loadRememberedUser();
  }, []);

  const userLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Please fill in both fields.");
      return;
    }

    if (email && password.length >= 6) {
      Alert.alert("Login successful", `Welcome, ${email}!`);

      if (rememberMe) {
        await SecureStore.setItemAsync("userEmail", email);
        await SecureStore.setItemAsync("userPassword", password);
      } else {
        await SecureStore.deleteItemAsync("userEmail");
        await SecureStore.deleteItemAsync("userPassword");
      }

      router.push("/EventFeed");
    } else {
      Alert.alert("Login failed", "Invalid credentials.");
    }
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.signupText}>
        Not a user? <Text style={styles.link}>Create account here</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 40,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "500",
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
    color: "#333",
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
    color: "#555",
  },
  link: {
    color: "#7a46ff",
    textDecorationLine: "underline",
  },
});
