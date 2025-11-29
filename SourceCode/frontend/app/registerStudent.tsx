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

const API_URL = "https://bookish-chainsaw-jj49r95xvj9h5x7x-3001.app.github.dev/auth"; 
// match the one used on login screen

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidStudentEmail = (email: string) => {
    return email.endsWith("@students.plymouth.ac.uk");
  };

  const isStrongPassword = (password: string) => {
    return password.length >= 8 && /\d/.test(password);
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    if (!isValidStudentEmail(email)) {
      Alert.alert(
        "Invalid Email",
        "You must use a valid @students.plymouth.ac.uk email address."
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
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Student", 
          email,
          password,
          role: "STUDENT",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      
      await SecureStore.setItemAsync("authToken", data.token);

      Alert.alert("Success", "Account created successfully!");
      router.replace("/EventFeed"); 
    } catch (err: any) {
      Alert.alert("Registration failed", err.message);
      console.log(err);
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

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
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
