import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image as RNImage,
} from "react-native";
import { useRouter } from "expo-router";
import { colours } from "../../lib/theme/colours";

interface PostCardProps {
  id: string;
  userId: string;
  username: string;
  userRole: "STUDENT" | "ORGANISATION";
  userAvatarUri?: string | null;
  imageUri?: string | null;
  caption: string;
  liked: boolean;
  likeCount: number;
  viewerRole?: "STUDENT" | "ORGANISATION" | null;
  onToggleLike: (postId: string) => void;
  onHashtagPress?: (hashtag: string) => void;
}

export default function PostCard({
  id,
  userId,
  username,
  userRole,
  userAvatarUri,
  imageUri,
  caption,
  liked,
  likeCount,
  viewerRole,
  onToggleLike,
  onHashtagPress,
}: PostCardProps) {
  const router = useRouter();

  const buildProfilePath = useCallback(() => {
    if (userRole === "ORGANISATION" && viewerRole === "STUDENT") {
      return "/Students/profileOrg";
    }

    if (userRole === "ORGANISATION") {
      return "/Organisations/profileOrg";
    }

    if (userRole === "STUDENT" && viewerRole === "ORGANISATION") {
      return "/Organisations/profileStudent";
    }

    return "/Students/profileStudent";
  }, [userRole, viewerRole]);

  const handleProfilePress = useCallback(() => {
    router.push({
      pathname: buildProfilePath() as any,
      params: {
        userId,
        username,
        viewerRole: viewerRole ?? undefined,
      },
    });
  }, [router, buildProfilePath, userId, username, viewerRole]);

  const handleToggleLike = useCallback(() => {
    onToggleLike(id);
  }, [id, onToggleLike]);

  const renderCaptionParts = useMemo(() => {
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
          onPress={() => onHashtagPress?.(p.text)}
        >
          {p.text}
        </Text>
      ) : (
        <Text key={i} style={styles.captionTextInline}>
          {p.text}
        </Text>
      )
    );
  }, [caption, onHashtagPress]);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.userAvatar}>
            {userAvatarUri ? (
              <RNImage
                source={{ uri: userAvatarUri }}
                style={styles.userAvatarImage}
              />
            ) : null}
          </View>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{username}</Text>
            {userRole === "ORGANISATION" ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.mediaCard}>
        {imageUri ? (
          <RNImage source={{ uri: imageUri }} style={styles.mediaImage} />
        ) : (
          <Text style={styles.mediaLabel}>image</Text>
        )}
      </View>

      <View style={styles.captionRow}>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={handleToggleLike}
          activeOpacity={0.8}
        >
          <Text style={[styles.likeIcon, liked && styles.likeIconOn]}>
            ♥
          </Text>
        </TouchableOpacity>

        <View style={styles.likeMeta}>
          <Text style={styles.likeCount}>
            {likeCount.toString()}
          </Text>
        </View>

        <Text style={styles.captionText} numberOfLines={2}>
          {renderCaptionParts}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: colours.surfaceDefault,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  postHeader: {
    padding: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  userAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  username: {
    color: colours.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
  verifiedBadge: {
    backgroundColor: colours.cosmicDustPink,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  mediaCard: {
    aspectRatio: 1,
    backgroundColor: colours.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaLabel: {
    color: colours.textSecondary,
    fontSize: 14,
  },
  captionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  likeBtn: {
    marginRight: 8,
  },
  likeIcon: {
    fontSize: 20,
    color: colours.textSecondary,
  },
  likeIconOn: {
    color: colours.cosmicDustPink,
  },
  likeMeta: {
    marginRight: 10,
  },
  likeCount: {
    color: colours.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  captionText: {
    flex: 1,
    color: colours.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  captionTextInline: {
    color: colours.textPrimary,
    fontSize: 14,
  },
  hashtag: {
    color: colours.starlightCyan,
    fontWeight: "600",
    fontSize: 14,
  },
});
