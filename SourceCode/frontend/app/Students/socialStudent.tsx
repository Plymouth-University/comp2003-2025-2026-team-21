import React, { useMemo, useState, useCallback, useEffect } from "react";
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
import BottomNav from "../components/BottomNav";
import { usePosts } from "../contexts/PostsContext";
import { getCurrentUser } from "../../lib/postsApi";
import { colours } from "../../lib/theme/colours";

export default function SocialStudent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, toggleLike, refreshPosts } = usePosts();

  const [activeTab, setActiveTab] = useState("social");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserAvatarUri, setCurrentUserAvatarUri] = useState<string | null>(null);

  const loadCurrentUserAvatar = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user.profileImage && user.profileImageMimeType) {
        setCurrentUserAvatarUri(
          `data:${user.profileImageMimeType};base64,${user.profileImage}`
        );
      } else {
        setCurrentUserAvatarUri(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadCurrentUserAvatar();
  }, [loadCurrentUserAvatar]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPosts();
    await loadCurrentUserAvatar();
    setRefreshing(false);
  }, [refreshPosts, loadCurrentUserAvatar]);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colours.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/Students/profileStudent")}
          activeOpacity={0.85}
        >
          <View style={styles.profileCircle}>
            {currentUserAvatarUri ? (
              <RNImage
                source={{ uri: currentUserAvatarUri }}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colours.textSecondary}
          />
        }
      >
        {filteredPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.userRow}>
                <TouchableOpacity
                  style={styles.userAvatar}
                  onPress={() =>
                    router.push({
                      pathname: "/Students/profileStudent",
                      params: { userId: post.userId, username: post.username },
                    })
                  }
                  activeOpacity={0.85}
                >
                  {post.userAvatarUri ? (
                    <RNImage
                      source={{ uri: post.userAvatarUri }}
                      style={styles.userAvatarImage}
                    />
                  ) : null}
                </TouchableOpacity>
                <Text style={styles.username}>{post.username}</Text>
              </View>
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

              <Text style={styles.likeCount}>{post.likeCount}</Text>

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
        onPress={() => router.push("/Students/createPost")}
        activeOpacity={0.85}
      >
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

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
    borderWidth: 1,
    borderColor: colours.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  searchInput: { flex: 1, color: colours.textPrimary, fontSize: 15, paddingRight: 10 },
  searchIcon: { color: colours.textSecondary, fontSize: 18, marginLeft: 8 },

  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: colours.border,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  postCard: { marginBottom: 22 },

  postHeader: { marginBottom: 10 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
  },
  userAvatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  username: { color: colours.textPrimary, fontSize: 16, fontWeight: "800" },

  mediaCard: {
    height: 380,
    borderRadius: 26,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.18 : 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  mediaLabel: { color: colours.textMuted, fontSize: 18, fontWeight: "800" },

  captionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  likeBtn: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },
  likeIcon: { fontSize: 22, color: colours.textSecondary, fontWeight: "900" },
  likeIconOn: { color: colours.success },
  likeCount: { color: colours.textSecondary, fontSize: 16, fontWeight: "800" },
  captionText: { flex: 1, color: colours.textPrimary, fontSize: 18, fontWeight: "800" },

  emptyCard: {
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
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
    backgroundColor: colours.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.3 : 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colours.border,
  },
  floatingButtonIcon: {
    fontSize: 32,
    color: colours.textPrimary,
    fontWeight: "700",
    lineHeight: 32,
  },
});