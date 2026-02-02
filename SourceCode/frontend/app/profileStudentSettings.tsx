import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import BottomNav from "./components/BottomNav";

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("social");
  const [notifications, setNotifications] = useState(true);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  const placeholder = (label: string) => {
    Alert.alert("Not wired yet", `${label} is a placeholder screen for now.`);
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
              // Clear all stored data
              await SecureStore.deleteItemAsync("authToken");
              await SecureStore.deleteItemAsync("userId");
              await SecureStore.deleteItemAsync("username");
              await SecureStore.deleteItemAsync("userEmail");
              await SecureStore.deleteItemAsync("userPassword");
              
              // Navigate back to login
              router.replace("/");
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        },
      ]
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This is a placeholder. Hook this to the backend later.",
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

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => placeholder("Edit profile picture")}
          activeOpacity={0.85}
        >
          <View style={styles.avatarCircle} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => placeholder("Change username")}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>change username</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => placeholder("Change password")}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>change password</Text>
        </TouchableOpacity>

        <View style={[styles.row, styles.rowSplit]}>
          <Text style={styles.rowText}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: "rgba(255,255,255,0.25)", true: "#3ad6c6" }}
            thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
            ios_backgroundColor="rgba(255,255,255,0.25)"
          />
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDelete}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteText}>delete account</Text>
        </TouchableOpacity>
      </View>

      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === "events") router.replace("/EventFeed");
          if (tab === "tickets") router.push("/myTickets");
          if (tab === "social") router.replace("/socialStudent");
          if (tab === "add") router.push("/EventFeed");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3c0303ff" },

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
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },

  title: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
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
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },
  editText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },

  row: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.26,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  rowSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },

  logoutBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,165,0,0.15)",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255,165,0,0.3)",
  },
  logoutText: {
    color: "#ffa500",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  deleteBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  deleteText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
});