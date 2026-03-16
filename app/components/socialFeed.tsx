import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TextInput,
  TouchableOpacity,
  Image as RNImage,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePosts } from "../../contexts/PostsContext";
import { colours } from "../../lib/theme/colours";
import * as SecureStore from "expo-secure-store";
import { getCurrentUser } from "../../lib/postsApi";
import PostCard from "./PostCard";

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

  const params = useLocalSearchParams<{ q?: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(
    () => (params.q ? String(params.q) : "")
  );
  const [resolvedProfilePath, setResolvedProfilePath] = useState<string>(
    profilePath || "/Students/profileStudent"
  );
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<
    "STUDENT" | "ORGANISATION" | null
  >(null);

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const lastTriggerRef = useRef<string | undefined>(undefined);

  const loadProfileAvatar = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user?.profileImageUrl) {
        setProfileImageUri(user.profileImageUrl);
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
    loadProfileAvatar();

    return () => {
      alive = false;
    };
  }, [profilePath, loadProfileAvatar]);

  useEffect(() => {
    if (!refreshTrigger) return;
    if (lastTriggerRef.current === refreshTrigger) return;
    lastTriggerRef.current = refreshTrigger;
    handleRefresh();
  }, [refreshTrigger, handleRefresh]);

  useEffect(() => {
    setLikeCounts((prev) => {
      const next = { ...prev };
      for (const p of posts) {
        const serverCount = (p as any).likeCount;
        if (typeof serverCount === "number") next[p.id] = serverCount;
        else if (next[p.id] === undefined) next[p.id] = 0;
      }
      return next;
    });
  }, [posts]);

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

  const handleToggleLike = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    const wasLiked = Boolean(post?.liked);

    setLikeCounts((prev) => {
      const current = prev[postId] ?? 0;
      const nextCount = Math.max(0, current + (wasLiked ? -1 : 1));
      return { ...prev, [postId]: nextCount };
    });

    toggleLike(postId);
  }, [posts, toggleLike]);

  const handleHashtagPress = useCallback((hashtag: string) => {
    setSearchQuery(hashtag);
  }, []);

  const renderPost = useCallback(({ item: post }: { item: (typeof posts)[number] }) => (
    <View style={styles.postCard}>
      <PostCard
        id={post.id}
        userId={post.userId}
        username={post.username}
        userRole={post.userRole}
        userAvatarUri={post.userAvatarUri}
        imageUri={post.imageUri}
        caption={post.caption}
        liked={post.liked}
        likeCount={likeCounts[post.id] ?? (post as any).likeCount ?? 0}
        viewerRole={viewerRole}
        onToggleLike={handleToggleLike}
        onHashtagPress={handleHashtagPress}
      />
    </View>
  ), [likeCounts, viewerRole, handleToggleLike, handleHashtagPress]);

  const keyExtractor = useCallback((item: (typeof posts)[number]) => item.id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No posts found</Text>
      <Text style={styles.emptyText}>Try searching by username or caption.</Text>
    </View>
  ), []);

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

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={ListEmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
      />

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

  postCard: { marginBottom: 10 },

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