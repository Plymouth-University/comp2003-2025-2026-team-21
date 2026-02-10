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
import { getUserPosts, getCurrentUser, getUserProfile, Post } from "../../lib/postsApi";
import { colours } from "../../lib/theme/colours";

export default function ProfileOrg() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    username?: string;
    viewerRole?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [orgName, setOrgName] = useState("Loading...");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    "STUDENT" | "ORGANISATION" | null
  >(null);
  const [orgPosts, setOrgPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const totalLikes = useMemo(
    () => orgPosts.reduce((sum, post) => sum + (post.likes ?? 0), 0),
    [orgPosts]
  );

  const normalizeParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const routeUserId = normalizeParam(params.userId) || null;
  const routeUsername = normalizeParam(params.username) || null;
  const routeViewerRole = normalizeParam(params.viewerRole) || null;
  const showSettings =
    currentUserRole === "ORGANISATION" &&
    (!routeUserId || (currentUserId && routeUserId === currentUserId));

  useEffect(() => {
    loadOrgProfile(routeUserId, routeUsername);
  }, [routeUserId, routeUsername]);

  useEffect(() => {
    let active = true;

    const loadCurrentUserId = async () => {
      let normalizedRole: "STUDENT" | "ORGANISATION" | null = null;
      let storedUserId: string | null = null;

      try {
        const me = await getCurrentUser();
        normalizedRole = me.role;
        storedUserId = me.id;
      } catch {
        const [fallbackUserId, storedRole] = await Promise.all([
          SecureStore.getItemAsync("userId"),
          SecureStore.getItemAsync("userRole"),
        ]);

        const fallbackRole = storedRole || (await SecureStore.getItemAsync("role"));
        normalizedRole = fallbackRole
          ? fallbackRole === "ORGANISATION"
            ? "ORGANISATION"
            : "STUDENT"
          : null;
        storedUserId = fallbackUserId;
      }

      if (active) {
        setCurrentUserId(storedUserId || null);
        setCurrentUserRole(normalizedRole);
      }
    };

    loadCurrentUserId();

    return () => {
      active = false;
    };
  }, []);

  const loadOrgProfile = async (
    targetUserId: string | null,
    targetUsername: string | null
  ) => {
    try {
      setLoading(true);
      setProfileImageUri(null);

      let finalOrgName: string | null = null;
      let finalUserId: string | null = targetUserId;

      if (finalUserId) {
        try {
          const user = await getUserProfile(finalUserId);

          if (user?.profileImage && user.profileImageMimeType) {
            setProfileImageUri(
              `data:${user.profileImageMimeType};base64,${user.profileImage}`
            );
          }

          if (user?.name) finalOrgName = user.name;
          else if (user?.username) finalOrgName = user.username;
          else if (targetUsername) finalOrgName = targetUsername;
        } catch {
          if (targetUsername) finalOrgName = targetUsername;
        }
      } else {
        try {
          const user = await getCurrentUser();

          if (user?.id) finalUserId = user.id;

          if (user?.profileImage && user.profileImageMimeType) {
            setProfileImageUri(
              `data:${user.profileImageMimeType};base64,${user.profileImage}`
            );
          }

          if (user?.name) finalOrgName = user.name;
          else if (user?.username) finalOrgName = user.username;
        } catch {}
      }

      if (!finalOrgName) {
        const storedOrgName =
          (await SecureStore.getItemAsync("organisationName")) ||
          (await SecureStore.getItemAsync("orgName")) ||
          (await SecureStore.getItemAsync("name"));
        if (storedOrgName) finalOrgName = storedOrgName;
      }

      if (!finalOrgName) {
        const storedUsername = await SecureStore.getItemAsync("username");
        if (storedUsername) finalOrgName = storedUsername;
      }

      if (!finalUserId) {
        const storedUserId = await SecureStore.getItemAsync("userId");
        if (storedUserId) finalUserId = storedUserId;
      }

      if (finalUserId) {
        setUserId(finalUserId);
        const posts = await getUserPosts(finalUserId);
        setOrgPosts(posts);

        if (!finalOrgName && posts.length > 0) {
          const fromPostName = posts[0]?.User?.name;
          const fromPostUsername = posts[0]?.User?.username;
          finalOrgName = fromPostName || fromPostUsername || null;
        }
      }

      setOrgName(finalOrgName || "Organisation");
    } catch {
      setOrgName("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrgProfile(routeUserId, routeUsername);
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
          {orgName}
        </Text>

        {showSettings ? (
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/Organisations/profileOrgSettings")}
            activeOpacity={0.85}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
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

        <Text style={styles.postsLabel}>Posts: {orgPosts.length}</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading posts...</Text>
        ) : orgPosts.length === 0 ? (
          <Text style={styles.emptyText}>No posts yet</Text>
        ) : (
          <View style={styles.grid}>
            {orgPosts.map((post) => (
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