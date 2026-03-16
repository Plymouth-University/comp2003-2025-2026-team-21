import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colours } from "../../lib/theme/colours";
import { getPostById, Post, deletePost, updatePost, getCurrentUser } from "../../lib/postsApi";

export default function PostDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!postId) {
        setError("Post not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get current user info
        const userInfo = await getCurrentUser();
        if (active) {
          setCurrentUserId(userInfo.id);
        }

        // Get post data
        const data = await getPostById(postId);
        if (active) {
          setPost(data);
          setEditCaption(data.caption);
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

    loadData();

    return () => {
      active = false;
    };
  }, [postId]);

  const isOwner = post && currentUserId && (post.studentId === currentUserId || post.organisationId === currentUserId);

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: handleDelete,
          style: "destructive",
        },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      if (!postId) return;
      await deletePost(postId);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete post");
    }
  };

  const handleEditPress = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setEditImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSaveEdit = async () => {
    if (!postId || (!editCaption && !editImage)) {
      Alert.alert("Error", "Please update the caption or image");
      return;
    }

    try {
      setEditLoading(true);
      const updatedPost = await updatePost(postId, editCaption, editImage || undefined);
      setPost(updatedPost);
      setShowEditModal(false);
      setEditImage(null);
      Alert.alert("Success", "Post updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update post");
    } finally {
      setEditLoading(false);
    }
  };

  const bottomPad = 24 + Math.max(insets.bottom, 0);

  const renderCaptionParts = (caption: string) => {
    const regex = /#[\w-]+/g;
    const parts: Array<{ text: string; isTag: boolean }> = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(caption)) !== null) {
      const idx = m.index;
      if (idx > lastIndex) {
        parts.push({ text: caption.slice(lastIndex, idx), isTag: false });
      }
      parts.push({ text: m[0], isTag: true });
      lastIndex = idx + m[0].length;
    }

    if (lastIndex < caption.length) {
      parts.push({ text: caption.slice(lastIndex), isTag: false });
    }

    return parts.map((p, i) =>
      p.isTag ? (
        <Text
          key={i}
          style={styles.hashtag}
          onPress={() =>
            router.push({ pathname: "/Students/socialStudent", params: { q: p.text } } as any)
          }
        >
          {p.text}
        </Text>
      ) : (
        <Text key={i} style={styles.captionTextInline}>
          {p.text}
        </Text>
      )
    );
  };

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
        {isOwner ? (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowMenu(!showMenu)}
            activeOpacity={0.85}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="none"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleEditPress}
            >
              <Text style={styles.dropdownText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownItem, styles.dropdownItemDanger]}
              onPress={handleDeletePress}
            >
              <Text style={[styles.dropdownText, styles.dropdownTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
              <Text style={styles.captionText}>{renderCaptionParts(post.caption)}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Edit Post Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => !editLoading && setShowEditModal(false)}
      >
        <SafeAreaView style={styles.editModalContainer} edges={["bottom"]}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => !editLoading && setShowEditModal(false)}
              disabled={editLoading}
              style={styles.editModalButton}
            >
              <Text style={styles.editModalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={editLoading}
              style={styles.editModalButton}
            >
              <Text style={styles.editModalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            {editImage ? (
              <View style={styles.editImagePreview}>
                <Image
                  source={{ uri: editImage }}
                  style={styles.editImagePreviewImg}
                />
                <TouchableOpacity
                  style={styles.editImageRemove}
                  onPress={() => setEditImage(null)}
                  disabled={editLoading}
                >
                  <Text style={styles.editImageRemoveText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : post ? (
              <View style={styles.editImagePreview}>
                <Image
                  source={{ uri: `data:${post.imageMimeType};base64,${post.image}` }}
                  style={styles.editImagePreviewImg}
                />
                <TouchableOpacity
                  style={styles.editImageRemove}
                  onPress={pickImage}
                  disabled={editLoading}
                >
                  <Text style={styles.editImageRemoveText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TextInput
              style={styles.editCaptionInput}
              placeholder="Edit your caption..."
              placeholderTextColor={colours.textMuted}
              value={editCaption}
              onChangeText={setEditCaption}
              multiline
              editable={!editLoading}
            />
          </ScrollView>

          {editLoading && (
            <View style={styles.editLoadingOverlay}>
              <ActivityIndicator size="large" color={colours.primary} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdownContainer: {
    alignSelf: "flex-end",
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
    minWidth: 120,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  dropdownItemDanger: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownTextDanger: {
    color: "#FF3B30",
  },

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
  captionTextInline: { color: colours.textPrimary, fontSize: 18, fontWeight: "800" },
  hashtag: { color: colours.secondary, fontSize: 18, fontWeight: "800" },

  // Edit modal styles
  editModalContainer: {
    flex: 1,
    backgroundColor: colours.background,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    minHeight: 70,
  },
  editModalButton: {
    minWidth: 70,
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  editModalClose: {
    color: colours.textSecondary,
    fontSize: 17,
    fontWeight: "600",
  },
  editModalTitle: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  editModalSave: {
    color: colours.primary,
    fontSize: 17,
    fontWeight: "600",
  },
  editModalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editImagePreview: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  editImagePreviewImg: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  editImageRemove: {
    backgroundColor: colours.glass,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  editImageRemoveText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  editCaptionInput: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colours.textPrimary,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  editLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});
