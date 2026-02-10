import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getUserPosts, getCurrentUser, getUserProfile, Post } from "../../lib/postsApi";
import { EventRecord, getEventsByOrganiser } from "../../lib/eventsApi";
import { getStaticMapUrl } from "../../lib/staticMaps";
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
  const [orgEvents, setOrgEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "events">("posts");
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [modalMapUrl, setModalMapUrl] = useState<string | null>(null);

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

  const mapUrl = selectedEvent
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        selectedEvent.organiser.location ?? selectedEvent.location
      )}`
    : "";

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

  useEffect(() => {
    let cancelled = false;

    if (!selectedEvent) {
      setModalMapUrl(null);
      return;
    }

    const mapLocation = selectedEvent.organiser.location ?? selectedEvent.location;
    getStaticMapUrl(mapLocation).then((url) => {
      if (!cancelled) {
        setModalMapUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  const loadOrgProfile = async (
    targetUserId: string | null,
    targetUsername: string | null
  ) => {
    try {
      setLoading(true);
      setLoadingEvents(true);
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
        const [posts, events] = await Promise.all([
          getUserPosts(finalUserId),
          getEventsByOrganiser(finalUserId),
        ]);
        setOrgPosts(posts);
        setOrgEvents(events);

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
      setLoadingEvents(false);
    }
  };

  const formatEventDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "TBD";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {orgName}
          </Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        </View>

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

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "posts" && styles.tabBtnActive]}
            onPress={() => setActiveTab("posts")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "posts" && styles.tabTextActive,
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "events" && styles.tabBtnActive]}
            onPress={() => setActiveTab("events")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "events" && styles.tabTextActive,
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "posts" ? (
          <>
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
          </>
        ) : (
          <>
            <Text style={styles.postsLabel}>Events: {orgEvents.length}</Text>

            {loadingEvents ? (
              <Text style={styles.loadingText}>Loading events...</Text>
            ) : orgEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              <View style={styles.eventsList}>
                {orgEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedEvent(event)}
                  >
                    <View style={styles.eventImageWrap}>
                      {event.eventImage ? (
                        <Image
                          source={{
                            uri: `data:${event.eventImageMimeType ?? "image/jpeg"};base64,${event.eventImage}`,
                          }}
                          style={styles.eventImage}
                        />
                      ) : (
                        <Text style={styles.eventImageText}>image</Text>
                      )}
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>
                        {formatEventDate(event.date)}
                      </Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>
                        {event.location}
                      </Text>
                      <Text style={styles.eventPrice} numberOfLines={1}>
                        {event.price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => null}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMeta}>
              {selectedEvent ? formatEventDate(selectedEvent.date) : ""}
            </Text>
            <Text style={styles.modalMeta}>{selectedEvent?.location}</Text>
            <Text style={styles.modalMeta}>{selectedEvent?.price}</Text>

            <View style={styles.mapFrame}>
              {modalMapUrl ? (
                <Image source={{ uri: modalMapUrl }} style={styles.mapImage} />
              ) : selectedEvent?.eventImage ? (
                <Image
                  source={{
                    uri: `data:${selectedEvent.eventImageMimeType ?? "image/jpeg"};base64,${selectedEvent.eventImage}`,
                  }}
                  style={styles.mapImage}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.eventImageText}>image</Text>
                </View>
              )}
            </View>

            {selectedEvent ? (
              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => Linking.openURL(mapUrl)}
              >
                <Text style={styles.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
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
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colours.success,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#0b2a17",
    fontSize: 12,
    fontWeight: "900",
    marginTop: -1,
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

  tabRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 14,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  tabBtnActive: {
    backgroundColor: colours.glass,
    borderColor: colours.primary,
  },
  tabText: {
    color: colours.textSecondary,
    fontWeight: "800",
    fontSize: 14,
  },
  tabTextActive: {
    color: colours.textPrimary,
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

  eventsList: {
    gap: 12,
    paddingBottom: 16,
  },
  eventCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  eventImageWrap: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  eventImageText: {
    color: colours.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  eventInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  eventTitle: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  eventMeta: {
    color: colours.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  eventPrice: {
    color: colours.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colours.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colours.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colours.textPrimary,
    flex: 1,
    paddingRight: 12,
  },
  modalClose: {
    color: colours.textMuted,
    fontWeight: "700",
  },
  modalMeta: {
    color: colours.textPrimary,
    fontSize: 16,
    marginBottom: 6,
  },
  mapFrame: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 10,
  },
  mapImage: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  openMapBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colours.primary,
    alignItems: "center",
  },
  openMapText: {
    color: colours.surface,
    fontWeight: "700",
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