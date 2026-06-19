import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { colours } from "../../lib/theme/colours";
import { fetchConversations, ConversationSummary } from "../../lib/messagesApi";

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colours.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No conversations yet.</Text>
            <Text style={styles.emptySubText}>
              Mutually follow a student to start messaging.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { otherStudent, lastMessage, unreadCount } = item;
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/Students/conversation",
                  params: {
                    conversationId: item.id,
                    otherName: otherStudent.name || otherStudent.username,
                    otherStudentId: otherStudent.id,
                  },
                } as any)
              }
            >
              <View style={styles.avatar}>
                {otherStudent.profileImageUrl ? (
                  <Image
                    source={{ uri: otherStudent.profileImageUrl }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={styles.avatarFallback}>
                    {(otherStudent.name || otherStudent.username)
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text
                    style={[styles.name, unreadCount > 0 && styles.nameUnread]}
                  >
                    {otherStudent.name || otherStudent.username}
                  </Text>
                  {lastMessage && (
                    <Text style={styles.time}>
                      {formatTime(lastMessage.createdAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[
                      styles.preview,
                      unreadCount > 0 && styles.previewUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessage?.content ?? "No messages yet"}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: colours.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.textPrimary,
    marginBottom: 6,
  },
  emptySubText: { fontSize: 13, color: colours.textMuted, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colours.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  avatarFallback: { fontSize: 20, fontWeight: "700", color: colours.primary },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  rowBottom: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colours.textPrimary },
  nameUnread: { fontWeight: "700", color: colours.textPrimary },
  time: { fontSize: 12, color: colours.textMuted },
  preview: { flex: 1, fontSize: 13, color: colours.textMuted },
  previewUnread: { color: colours.textPrimary, fontWeight: "600" },
  badge: {
    backgroundColor: colours.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
