import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  Platform,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../lib/api";
import { colours, spacing, borderRadius, shadows } from "../../lib/theme/colours";
import ThemedInput from "../components/ThemedInput";
import ThemedButton from "../components/ThemedButton";
import CosmicBackground from "../components/CosmicBackground";

export default function RegisterOrg() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    orgName: "",
    orgLocation: "",
    email: "",
    password: "",
  });

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

  const validateForm = () => {
    const newErrors = {
      orgName: "",
      orgLocation: "",
      email: "",
      password: "",
    };

    if (!orgName.trim()) {
      newErrors.orgName = "Organisation name is required";
    }

    if (!orgLocation.trim()) {
      newErrors.orgLocation = "Location is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isStrongPassword(password)) {
      newErrors.password = "Min 8 characters with at least 1 number";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleRegister = async () => {
    if (!validateForm()) {
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
      await SecureStore.setItemAsync("userRole", user.role);
      await SecureStore.setItemAsync("role", user.role);

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
          <Text style={styles.subtitle}>Register your organisation</Text>

          <ThemedInput
            label="Organisation Name"
            placeholder="Uni Society / Venue / Club"
            value={orgName}
            onChangeText={(text) => {
              setOrgName(text);
              if (errors.orgName) setErrors({ ...errors, orgName: "" });
            }}
            autoCapitalize="words"
            error={errors.orgName}
          />

          <ThemedInput
            label="Organisation Location"
            placeholder="Street, City"
            value={orgLocation}
            onChangeText={(text) => {
              setOrgLocation(text);
              if (errors.orgLocation) setErrors({ ...errors, orgLocation: "" });
            }}
            autoCapitalize="words"
            error={errors.orgLocation}
          />

          <ThemedInput
            label="Organisation Email"
            placeholder="org@email.com"
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

          <TouchableOpacity onPress={() => router.back()}>
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
    backgroundColor: colours.background,
  },
  keyboardView: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.65)",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
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
  label: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: spacing.sm,
    fontSize: 15,
    fontWeight: "600",
    color: colours.textPrimary,
  },
  evidenceBtn: {
    backgroundColor: colours.glass,
    width: "100%",
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1.5,
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
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  previewWrap: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    backgroundColor: colours.surfaceElevated,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  previewImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
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