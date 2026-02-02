import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import BottomNav from "./components/BottomNav";
import { getUserPosts, getCurrentUser, Post } from "../lib/postsApi";

export default function ProfileStudent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("social");
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState("Loading...");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const followers = 100;

  // Load user info and their posts
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      let finalUsername = null;
      let finalUserId = null;
      
      // Try 1: Get from backend
      try {
        const user = await getCurrentUser();
        console.log("Fetched user from backend:", user);
        
        if (user.username) {
          finalUsername = user.username;
        }
        finalUserId = user.id;
      } catch (error) {
        console.log("Failed to fetch from backend, will try other sources");
      }
      
      // Try 2: Get from SecureStore (saved during login/registration)
      if (!finalUsername) {
        const storedUsername = await SecureStore.getItemAsync("username");
        if (storedUsername) {
          console.log("Got username from SecureStore:", storedUsername);
          finalUsername = storedUsername;
        }
      }
      
      if (!finalUserId) {
        const storedUserId = await SecureStore.getItemAsync("userId");
        if (storedUserId) {
          finalUserId = storedUserId;
        }
      }
      
      // Fetch user's posts
      if (finalUserId) {
        setUserId(finalUserId);
        const posts = await getUserPosts(finalUserId);
        setUserPosts(posts);
        
        // Try 3: Get username from posts if still not found
        if (!finalUsername && posts.length > 0 && posts[0].User?.username) {
          finalUsername = posts[0].User.username;
          console.log("Got username from post:", finalUsername);
        }
      }
      
      setUsername(finalUsername || "Username not available");
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUsername("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  }, []);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {username}
        </Text>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/profileStudentSettings")}
          activeOpacity={0.85}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle} />
        </View>

        <Text style={styles.followersText}>Followers: {followers}</Text>

        <Text style={styles.postsLabel}>
          Posts: {userPosts.length}
        </Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading posts...</Text>
        ) : userPosts.length === 0 ? (
          <Text style={styles.emptyText}>No posts yet</Text>
        ) : (
          <View style={styles.grid}>
            {userPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.tile} activeOpacity={0.8}>
                <Image
                  source={{ uri: `data:${post.imageMimeType};base64,${post.image}` }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          if (tab === activeTab) {
            handleRefresh();
          } else {
            setActiveTab(tab);
            if (tab === "events") router.replace("/EventFeed");
            if (tab === "tickets") router.push("/myTickets");
            if (tab === "social") router.replace("/socialStudent");
            if (tab === "add") router.push("/EventFeed");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3c0303ff" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 12,
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

  headerTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  settingsIcon: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 22,
    fontWeight: "900",
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  avatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 12 },

  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },

  followersText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
  },

  postsLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingBottom: 12,
  },

  tile: {
    width: `${(100 / 3) - 0.7}%`,
    aspectRatio: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },

  postImage: {
    width: "100%",
    height: "100%",
  },

  loadingText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginTop: 20,
  },

  emptyText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginTop: 20,
  },
});