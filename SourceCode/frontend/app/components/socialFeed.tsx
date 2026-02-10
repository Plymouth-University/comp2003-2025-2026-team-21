import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
  TouchableOpacity,
  Image as RNImage,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { usePosts } from "../../contexts/PostsContext";
import { colours } from "../../lib/theme/colours";
import * as SecureStore from "expo-secure-store";
import { getCurrentUser } from "../../lib/postsApi";

interface Props {
  refreshTrigger?: string;
  profilePath?: string;
  createPostPath?: string;
}

export default function SocialFeed({
  refreshTrigger,
  profilePath,
  createPostPath = "/Students/createPost",
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, toggleLike, refreshPosts } = usePosts();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedProfilePath, setResolvedProfilePath] = useState<string>(
    profilePath || "/Students/profileStudent"
  );
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<
    "STUDENT" | "ORGANISATION" | null
  >(null);

  const lastTriggerRef = useRef<string | undefined>(undefined);

  const loadProfileAvatar = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user?.profileImage && user.profileImageMimeType) {
        setProfileImageUri(
          `data:${user.profileImageMimeType};base64,${user.profileImage}`
        );
      } else {
        setProfileImageUri(null);
      }
    } catch {
      setProfileImageUri(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPosts();
      await loadProfileAvatar();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPosts, loadProfileAvatar]);

  useEffect(() => {
    let alive = true;

    const resolveProfile = async () => {
      if (profilePath) {
        if (alive) setResolvedProfilePath(profilePath);
        return;
      }

      const role =
        (await SecureStore.getItemAsync("userRole")) ||
        (await SecureStore.getItemAsync("role"));

      const normalizedRole = role === "ORGANISATION" ? "ORGANISATION" : "STUDENT";

      const next =
        normalizedRole === "ORGANISATION"
          ? "/Organisations/profileOrg"
          : "/Students/profileStudent";

      if (alive) setViewerRole(normalizedRole);

      if (alive) setResolvedProfilePath(next);
    };

    resolveProfile();

    return () => {
      alive = false;
    };
    loadProfileAvatar();
  }, [profilePath, loadProfileAvatar]);

  useEffect(() => {
    if (!refreshTrigger) return;
    if (lastTriggerRef.current === refreshTrigger) return;
    lastTriggerRef.current = refreshTrigger;
    handleRefresh();
  }, [refreshTrigger, handleRefresh]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  const bottomPad = 110 + Math.max(insets.bottom, 0);
  const buildProfilePath = (post: (typeof posts)[number]) => {
    if (post.userRole === "ORGANISATION" && viewerRole === "STUDENT") {
      return "/Students/profileOrg";
    }

    if (post.userRole === "ORGANISATION") {
      return "/Organisations/profileOrg";
    }

    if (post.userRole === "STUDENT" && viewerRole === "ORGANISATION") {
      return "/Organisations/profileStudent";
    }

    return "/Students/profileStudent";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push(resolvedProfilePath as any)}
          activeOpacity={0.85}
        >
          <View style={styles.profileCircle}>
            {profileImageUri ? (
              <RNImage
                source={{ uri: profileImageUri }}
                style={styles.profileImage}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={styles.userRow}
                onPress={() =>
                  router.push({
                    pathname: buildProfilePath(post) as any,
                    params: {
                      userId: post.userId,
                      username: post.username,
                      viewerRole: viewerRole ?? undefined,
                    },
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.userAvatar}>
                  {post.userAvatarUri ? (
                    <RNImage
                      source={{ uri: post.userAvatarUri }}
                      style={styles.userAvatarImage}
                    />
                  ) : null}
                </View>
                <Text style={styles.username}>{post.username}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mediaCard}>
              {post.imageUri ? (
                <RNImage source={{ uri: post.imageUri }} style={styles.mediaImage} />
              ) : (
                <Text style={styles.mediaLabel}>image</Text>
              )}
            </View>

            <View style={styles.captionRow}>
              <TouchableOpacity
                style={styles.likeBtn}
                onPress={() => toggleLike(post.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.likeIcon, post.liked && styles.likeIconOn]}>
                  ♥
                </Text>
              </TouchableOpacity>

              <Text style={styles.captionText} numberOfLines={2}>
                {post.caption}
              </Text>
            </View>
          </View>
        ))}

        {filteredPosts.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No posts found</Text>
            <Text style={styles.emptyText}>Try searching by username or caption.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push(createPostPath as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colours.border,
  },
  searchInput: { flex: 1, color: colours.textPrimary, fontSize: 15, paddingRight: 10 },
  searchIcon: { color: "rgba(255,255,255,0.7)", fontSize: 18, marginLeft: 8 },

  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  profileImage: { width: "100%", height: "100%", resizeMode: "cover" },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  postCard: { marginBottom: 22 },

  postHeader: { marginBottom: 10 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  userAvatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  username: { color: colours.textPrimary, fontSize: 16, fontWeight: "800" },

  mediaCard: {
    height: 380,
    borderRadius: 26,
    backgroundColor: colours.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.18 : 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
  },
  mediaImage: { width: "100%", height: "100%", resizeMode: "cover" },
  mediaLabel: { color: colours.textSecondary, fontSize: 18, fontWeight: "800" },

  captionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  likeBtn: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },
  likeIcon: { fontSize: 22, color: colours.textSecondary, fontWeight: "900" },
  likeIconOn: { color: colours.success },
  captionText: { flex: 1, color: colours.textPrimary, fontSize: 18, fontWeight: "800" },

  emptyCard: {
    backgroundColor: colours.glass,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colours.border,
  },
  emptyTitle: { color: colours.textPrimary, fontWeight: "900", fontSize: 16, marginBottom: 4 },
  emptyText: { color: colours.textSecondary },

  floatingButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colours.success,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.3 : 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonIcon: { fontSize: 32, color: colours.textPrimary, fontWeight: "700", lineHeight: 32 },
});