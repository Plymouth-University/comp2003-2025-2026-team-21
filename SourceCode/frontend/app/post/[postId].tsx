import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colours } from "../../lib/theme/colours";
import { getPostById, Post } from "../../lib/postsApi";

export default function PostDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPost = async () => {
      if (!postId) {
        setError("Post not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getPostById(postId);
        if (active) {
          setPost(data);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load post");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      active = false;
    };
  }, [postId]);

  const bottomPad = 24 + Math.max(insets.bottom, 0);

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
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {loading ? (
          <Text style={styles.statusText}>Loading post...</Text>
        ) : error ? (
          <Text style={styles.statusText}>{error}</Text>
        ) : post ? (
          <View style={styles.card}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                {post.User.profileImage && post.User.profileImageMimeType ? (
                  <Image
                    source={{
                      uri: `data:${post.User.profileImageMimeType};base64,${post.User.profileImage}`,
                    }}
                    style={styles.avatarImage}
                  />
                ) : null}
              </View>
              <Text style={styles.username}>{post.User.username}</Text>
            </View>

            <View style={styles.mediaCard}>
              <Image
                source={{ uri: `data:${post.imageMimeType};base64,${post.image}` }}
                style={styles.mediaImage}
              />
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.likesText}>{post.likes} likes</Text>
              <Text style={styles.captionText}>{post.caption}</Text>
            </View>
          </View>
        ) : null}
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
    fontSize: 22,
    fontWeight: "900",
  },
  headerSpacer: { width: 44, height: 44 },

  scrollArea: { flex: 1, paddingHorizontal: 16 },
  statusText: {
    color: colours.textSecondary,
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },

  card: { marginTop: 8, gap: 14 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  username: { color: colours.textPrimary, fontSize: 18, fontWeight: "800" },

  mediaCard: {
    height: 420,
    borderRadius: 26,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
  },
  mediaImage: { width: "100%", height: "100%", resizeMode: "cover" },

  metaRow: { gap: 8 },
  likesText: { color: colours.textSecondary, fontSize: 16, fontWeight: "800" },
  captionText: { color: colours.textPrimary, fontSize: 18, fontWeight: "800" },
});
