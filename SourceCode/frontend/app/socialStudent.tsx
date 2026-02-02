import React, { useMemo, useState, useCallback } from "react";
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
import BottomNav from "./components/BottomNav";
import { usePosts } from "./contexts/PostsContext";

export default function SocialStudent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, toggleLike } = usePosts();

  const [activeTab, setActiveTab] = useState("social");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 700));
    setRefreshing(false);
  }, []);

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
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/profileStudent")}
          activeOpacity={0.85}
        >
          <View style={styles.profileCircle} />
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
              <View style={styles.userRow}>
                <View style={styles.userAvatar} />
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
        onPress={() => router.push("/createPost")}
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
    backgroundColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 15, paddingRight: 10 },
  searchIcon: { color: "rgba(255,255,255,0.7)", fontSize: 18, marginLeft: 8 },

  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  postCard: { marginBottom: 22 },

  postHeader: { marginBottom: 10 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  username: { color: "#fff", fontSize: 16, fontWeight: "800" },

  mediaCard: {
    height: 380,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.35)",
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
  mediaLabel: { color: "rgba(255,255,255,0.65)", fontSize: 18, fontWeight: "800" },

  captionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  likeBtn: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  likeIcon: { fontSize: 22, color: "rgba(255,255,255,0.65)", fontWeight: "900" },
  likeIconOn: { color: "#00c853" },
  captionText: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800" },

  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16, marginBottom: 4 },
  emptyText: { color: "rgba(255,255,255,0.75)" },

  floatingButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00c853",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.3 : 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonIcon: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 32,
  },
});