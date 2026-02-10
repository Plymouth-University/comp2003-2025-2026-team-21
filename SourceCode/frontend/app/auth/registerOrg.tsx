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
  Image,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../lib/api";
import { colours } from "../../lib/theme/colours";

export default function RegisterOrg() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v.trim());
  const isStrongPassword = (v: string) => v.length >= 8 && /\d/.test(v);

  const pickEvidence = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setEvidenceUri(result.assets[0].uri);
    }
  };

  const registerRequest = async () => {
    const url = `${API_URL}/auth/register-org`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgName.trim(),
        location: orgLocation.trim(),
        email: email.trim(),
        password,
      }),
    });

    const raw = await res.text();

    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${res.status})`);
      }
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Registration failed (HTTP ${res.status})`);
    }

    if (!data?.token || !data?.user) {
      throw new Error("Registration response missing token/user");
    }

    return data as {
      token: string;
      user: {
        id: string;
        email: string;
        role: string;
        name?: string;
        username?: string;
        location?: string | null;
      };
    };
  };

  const handleRegister = async () => {
    if (!orgName.trim() || !orgLocation.trim() || !email.trim() || !password) {
      Alert.alert(
        "Missing Fields",
        "Please fill in organisation name, location, email and password."
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert("Weak Password", "Password must be at least 8 characters and contain a number.");
      return;
    }

    if (!evidenceUri) {
      Alert.alert("Evidence Required", "Please upload a photo as evidence.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await registerRequest();

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);

      if (user?.username) {
        await SecureStore.setItemAsync("username", user.username);
      } else if (user?.name) {
        await SecureStore.setItemAsync("username", user.name);
      }

      if (user?.location) {
        await SecureStore.setItemAsync("orgLocation", user.location);
      } else if (orgLocation.trim()) {
        await SecureStore.setItemAsync("orgLocation", orgLocation.trim());
      }

      await SecureStore.setItemAsync("orgEvidenceUri", evidenceUri);

      Alert.alert("Success", "Organisation account created successfully!");
      router.replace("../Organisations/eventsOrg");
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
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Organisation Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Uni Society / Venue / Club"
          placeholderTextColor={colours.textMuted}
          autoCapitalize="words"
          value={orgName}
          onChangeText={setOrgName}
        />

        <Text style={styles.label}>Organisation Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Street, City"
          placeholderTextColor={colours.textMuted}
          autoCapitalize="words"
          value={orgLocation}
          onChangeText={setOrgLocation}
        />

        <Text style={styles.label}>Organisation Email</Text>
        <TextInput
          style={styles.input}
          placeholder="org@email.com"
          placeholderTextColor={colours.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Create Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          placeholderTextColor={colours.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Evidence Photo</Text>
        <TouchableOpacity style={styles.evidenceBtn} onPress={pickEvidence} activeOpacity={0.85}>
          <Text style={styles.evidenceBtnText}>{evidenceUri ? "Change Photo" : "Upload Photo"}</Text>
        </TouchableOpacity>

        {evidenceUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: evidenceUri }} style={styles.previewImage} />
          </View>
        ) : (
          <Text style={styles.helperText}>Upload a photo to verify your organisation (placeholder for now).</Text>
        )}

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={colours.textPrimary} /> : <Text style={styles.registerText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loginText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: colours.background,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    color: colours.textPrimary,
  },

  label: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "500",
    color: colours.textPrimary,
  },

  input: {
    width: "100%",
    height: 50,
    backgroundColor: colours.surface,
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colours.textPrimary,
    borderWidth: 1,
    borderColor: colours.border,
  },

  evidenceBtn: {
    backgroundColor: colours.glass,
    width: "100%",
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colours.border,
  },

  evidenceBtnText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  helperText: {
    width: "100%",
    color: colours.textSecondary,
    fontSize: 13,
    marginBottom: 14,
  },

  previewWrap: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colours.surfaceElevated,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.18 : 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },

  previewImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },

  registerBtn: {
    backgroundColor: colours.primary,
    width: 180,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  registerText: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },

  loginText: {
    marginTop: 20,
    fontSize: 14,
    color: colours.textPrimary,
    textDecorationLine: "underline",
  },
});