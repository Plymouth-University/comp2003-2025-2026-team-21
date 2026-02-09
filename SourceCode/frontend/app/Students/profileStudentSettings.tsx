import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import BottomNav from "../components/BottomNav";
import { getCurrentUser, updateProfileImage, updatePassword } from "../../lib/postsApi";
import { colours } from "../../lib/theme/colours";

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("social");
  const [notifications, setNotifications] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  useEffect(() => {
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const user = await getCurrentUser();
      if (user.profileImage && user.profileImageMimeType) {
        setProfileImageUri(
          `data:${user.profileImageMimeType};base64,${user.profileImage}`
        );
      }
    } catch {}
  };

  const handlePickProfileImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const nextUri = result.assets[0].uri;
    const previousUri = profileImageUri;

    try {
      setUploading(true);
      setProfileImageUri(nextUri);
      const updated = await updateProfileImage(nextUri);

      if (updated.profileImage && updated.profileImageMimeType) {
        setProfileImageUri(
          `data:${updated.profileImageMimeType};base64,${updated.profileImage}`
        );
      }

      Alert.alert("Success", "Profile picture updated.");
    } catch (error: any) {
      setProfileImageUri(previousUri || null);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile picture."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync("authToken");
              await SecureStore.deleteItemAsync("userId");
              await SecureStore.deleteItemAsync("username");
              await SecureStore.deleteItemAsync("userEmail");
              await SecureStore.deleteItemAsync("userPassword");
              router.replace("/");
            } catch {
              Alert.alert("Error", "Failed to logout.");
            }
          }
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await updatePassword(currentPassword, newPassword, confirmPassword);
      await SecureStore.setItemAsync("userPassword", newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This is a placeholder.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handlePickProfileImage}
          activeOpacity={0.85}
          disabled={uploading}
        >
          <View style={styles.avatarCircle}>
            {profileImageUri && (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            )}
          </View>
          <Text style={styles.editText}>
            {uploading ? "Saving..." : "Edit"}
          </Text>
        </TouchableOpacity>

        <View style={styles.passwordCard}>
          <Text style={styles.sectionTitle}>Change password</Text>

          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={colours.textMuted}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={colours.textMuted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Re-enter new password"
            placeholderTextColor={colours.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveBtn, savingPassword && styles.saveBtnDisabled]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            <Text style={styles.saveBtnText}>
              {savingPassword ? "Saving..." : "Update password"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.row, styles.rowSplit]}>
          <Text style={styles.rowText}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colours.border, true: colours.secondary }}
            thumbColor={Platform.OS === "android" ? colours.textPrimary : undefined}
            ios_backgroundColor={colours.border}
          />
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>delete account</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === "events") router.replace("/Students/EventFeed");
          if (tab === "tickets") router.push("/Students/myTickets");
          if (tab === "social") router.replace("/Students/socialStudent");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },

  backIcon: {
    color: colours.textPrimary,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },

  title: {
    flex: 1,
    textAlign: "center",
    color: colours.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    marginRight: 44,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  avatarWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 22,
  },

  avatarCircle: {
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: colours.surfaceElevated,
    borderWidth: 2,
    borderColor: colours.border,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  editText: {
    marginTop: 10,
    color: colours.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },

  row: {
    backgroundColor: colours.glass,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },

  rowSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowText: {
    color: colours.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },

  passwordCard: {
    backgroundColor: colours.glass,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },

  sectionTitle: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },

  input: {
    backgroundColor: colours.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colours.textPrimary,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colours.border,
  },

  saveBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colours.primary,
    borderWidth: 1,
    borderColor: colours.border,
  },

  saveBtnDisabled: { opacity: 0.7 },

  saveBtnText: {
    textAlign: "center",
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },

  logoutBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colours.glass,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colours.secondary,
  },

  logoutText: {
    color: colours.secondary,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  deleteBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colours.glass,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },

  deleteText: {
    color: colours.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
});