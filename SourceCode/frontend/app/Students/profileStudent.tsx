import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import BottomNav from "../components/BottomNav";
import { getUserPosts, getCurrentUser, getUserProfile, Post } from "../../lib/postsApi";
import { colours } from "../../lib/theme/colours";

export default function ProfileStudent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; username?: string }>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("social");
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState("Loading...");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const totalLikes = useMemo(
    () => userPosts.reduce((sum, post) => sum + (post.likes ?? 0), 0),
    [userPosts]
  );

  const normalizeParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const routeUserId = normalizeParam(params.userId) || null;
  const routeUsername = normalizeParam(params.username) || null;
  const viewingOther = Boolean(routeUserId);

  useEffect(() => {
    loadUserProfile(routeUserId, routeUsername);
  }, [routeUserId, routeUsername]);

  const loadUserProfile = async (
    targetUserId: string | null,
    targetUsername: string | null
  ) => {
    try {
      setLoading(true);
      setProfileImageUri(null);

      let finalUsername: string | null = targetUsername;
      let finalUserId: string | null = targetUserId;

      if (finalUserId) {
        try {
          const user = await getUserProfile(finalUserId);
          if (user?.username) finalUsername = user.username;
          if (user?.profileImage && user.profileImageMimeType) {
            setProfileImageUri(
              `data:${user.profileImageMimeType};base64,${user.profileImage}`
            );
          }
        } catch {}
      } else {
        try {
          const user = await getCurrentUser();
          if (user?.username) finalUsername = user.username;
          if (user?.id) finalUserId = user.id;
          if (user?.profileImage && user.profileImageMimeType) {
            setProfileImageUri(
              `data:${user.profileImageMimeType};base64,${user.profileImage}`
            );
          }
        } catch {}
      }

      if (!finalUsername) {
        const storedUsername = await SecureStore.getItemAsync("username");
        if (storedUsername) finalUsername = storedUsername;
      }

      if (!finalUserId) {
        const storedUserId = await SecureStore.getItemAsync("userId");
        if (storedUserId) finalUserId = storedUserId;
      }

      if (finalUserId) {
        setUserId(finalUserId);
        const posts = await getUserPosts(finalUserId);
        setUserPosts(posts);

        if (!finalUsername && posts.length > 0 && posts[0]?.User?.username) {
          finalUsername = posts[0].User.username;
        }
      }

      setUsername(finalUsername || "Username not available");
    } catch {
      setUsername("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile(routeUserId, routeUsername);
    setRefreshing(false);
  }, [routeUserId, routeUsername]);

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

        {viewingOther ? (
          <View style={styles.headerSpacer} />
        ) : (
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/Students/profileStudentSettings")}
            activeOpacity={0.85}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : null}
          </View>
        </View>

        <Text style={styles.likesText}>Likes: {totalLikes}</Text>

        <Text style={styles.postsLabel}>Posts: {userPosts.length}</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading posts...</Text>
        ) : userPosts.length === 0 ? (
          <Text style={styles.emptyText}>No posts yet</Text>
        ) : (
          <View style={styles.grid}>
            {userPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.tile}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/post/[postId]",
                    params: { postId: post.id },
                  })
                }
              >
                <Image
                  source={{
                    uri: `data:${post.imageMimeType};base64,${post.image}`,
                  }}
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
            if (tab === "events") router.replace("/Students/EventFeed");
            if (tab === "tickets") router.push("/Students/myTickets");
            if (tab === "social") router.replace("/Students/socialStudent");
            if (tab === "add") router.push("/Students/EventFeed");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colours.background,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    color: colours.textPrimary,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },

  headerTitle: {
    color: colours.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },

  headerSpacer: {
    width: 44,
    height: 44,
  },

  settingsIcon: {
    color: colours.textSecondary,
    fontSize: 22,
    fontWeight: "900",
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  avatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 12 },

  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: colours.surface,
    borderWidth: 2,
    borderColor: colours.border,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  likesText: {
    textAlign: "center",
    color: colours.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
  },

  postsLabel: {
    textAlign: "center",
    color: colours.textSecondary,
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
    width: `${100 / 3 - 0.7}%`,
    aspectRatio: 1,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
  },

  postImage: {
    width: "100%",
    height: "100%",
  },

  loadingText: {
    textAlign: "center",
    color: colours.textMuted,
    fontSize: 16,
    marginTop: 20,
  },

  emptyText: {
    textAlign: "center",
    color: colours.textMuted,
    fontSize: 16,
    marginTop: 20,
  },
});