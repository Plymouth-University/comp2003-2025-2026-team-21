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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import ImageCropPicker from "react-native-image-crop-picker";
import { Ionicons } from "@expo/vector-icons";
import { clearSession } from "../../lib/auth";
import {
  clearCurrentUserCache,
  deleteAccount,
  getCurrentUser,
  updatePassword,
  updateProfileImage,
} from "../../lib/postsApi";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../lib/notificationsApi";
import {
  registerForPushNotifications,
  unregisterForPushNotifications,
} from "../../lib/notifications";
import { colours, spacing, shadows } from "../../lib/theme/colours";

export default function ProfileOrgSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  useEffect(() => {
    loadProfileImage();
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await getNotificationSettings();
      setNotifications(settings.notificationsEnabled);
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadProfileImage = async () => {
    try {
      const user = await getCurrentUser();
      if (user.profileImageUrl) {
        setProfileImageUri(user.profileImageUrl);
      }
      if (user.username) {
        setUsername(user.username);
      } else if (user.name) {
        setUsername(user.name);
      }
    } catch {}
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotifications(value);
      await updateNotificationSettings(value);

      if (value) {
        // Register for push notifications when enabled
        await registerForPushNotifications();
      } else {
        // Unregister when disabled
        await unregisterForPushNotifications();
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      // Revert on error
      setNotifications(!value);
      Alert.alert(
        "Error",
        "Failed to update notification settings. Please try again.",
      );
    }
  };

  const handlePickProfileImage = async () => {
    let image;
    try {
      image = await ImageCropPicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
      });
    } catch {
      return;
    }

    const nextUri = image.path;
    const previousUri = profileImageUri;

    try {
      setUploading(true);
      setProfileImageUri(nextUri);
      const updated = await updateProfileImage(nextUri);

      if (updated.profileImageUrl) {
        setProfileImageUri(updated.profileImageUrl);
      }

      Alert.alert("Success", "Profile picture updated.");
    } catch (error: any) {
      setProfileImageUri(previousUri || null);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await unregisterForPushNotifications();
          await clearSession();
          router.dismissAll();
          router.replace("/");
        },
      },
    ]);
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
      await SecureStore.setItemAsync("orgPassword", newPassword);
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

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await deleteAccount();
      await clearSession();
      router.dismissAll();
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and data.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDeleteAccount },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/Organisations/profileOrg" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Text style={styles.sectionHeader}>profile</Text>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handlePickProfileImage}
          activeOpacity={0.85}
          disabled={uploading}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {profileImageUri && (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.avatarImage}
                />
              )}
              {!profileImageUri && (
                <Ionicons name="business" size={50} color={colours.textMuted} />
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color={colours.textPrimary} />
            </View>
          </View>
          {username ? <Text style={styles.username}>{username}</Text> : null}
          <Text style={styles.editText}>
            {uploading ? "Saving..." : "Tap to change logo"}
          </Text>
        </TouchableOpacity>

        {/* Security Section */}
        <Text style={styles.sectionHeader}>security</Text>
        <View style={styles.passwordCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="lock-closed" size={20} color={colours.primary} />
            <Text style={styles.sectionTitle}>Change password</Text>
          </View>

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
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colours.textPrimary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.saveBtnText}>
              {savingPassword ? "Saving..." : "Update password"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>preferences</Text>
        <View style={[styles.row, styles.rowSplit]}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="notifications"
              size={22}
              color={colours.secondary}
              style={{ marginRight: 12 }}
            />
            <Text style={styles.rowText}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colours.border, true: colours.secondary }}
            thumbColor={
              Platform.OS === "android" ? colours.textPrimary : undefined
            }
            ios_backgroundColor={colours.border}
            disabled={loadingSettings}
          />
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionHeaderDanger}>danger zone</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colours.secondary}
            style={{ marginRight: 12 }}
          />
          <Text style={styles.logoutText}>logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDelete}
          disabled={deletingAccount}
        >
          <Ionicons
            name="trash"
            size={20}
            color="#ff3b30"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.deleteText}>
            {deletingAccount ? "Deleting..." : "delete account"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },

  headerSpacer: { width: 44 },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  sectionHeader: {
    color: colours.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },

  sectionHeaderDanger: {
    color: "#ff3b30",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 32,
    marginBottom: 10,
    marginLeft: 4,
  },

  avatarWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },

  avatarCircle: {
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: colours.surfaceElevated,
    borderWidth: 3,
    borderColor: colours.primary,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...shadows.glow,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colours.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colours.background,
  },

  username: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  editText: {
    color: colours.textSecondary,
    fontSize: 14,
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

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowText: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  passwordCard: {
    backgroundColor: colours.glass,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  input: {
    backgroundColor: colours.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colours.textPrimary,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colours.border,
  },

  saveBtn: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colours.surfaceElevated,
    borderWidth: 1,
    borderColor: colours.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  saveBtnDisabled: { opacity: 0.7 },

  saveBtnText: {
    textAlign: "center",
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  logoutBtn: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colours.glass,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colours.secondary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    color: colours.secondary,
    fontSize: 18,
    fontWeight: "900",
  },

  deleteBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,59,48,0.12)",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.4)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
