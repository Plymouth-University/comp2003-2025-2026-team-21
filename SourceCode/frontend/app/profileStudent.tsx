import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import BottomNav from "./components/BottomNav";

type Tile = { id: string };

export default function ProfileStudent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("social");
  const [refreshing, setRefreshing] = useState(false);

  const username = "Username";
  const followers = 100;

  const tiles = useMemo<Tile[]>(
    () => Array.from({ length: 6 }).map((_, i) => ({ id: String(i + 1) })),
    []
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 650));
    setRefreshing(false);
  }, []);

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
          {username}
        </Text>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/profileStudentSettings")}
          activeOpacity={0.85}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle} />
        </View>

        <Text style={styles.followersText}>Followers: {followers}</Text>

        <Text style={styles.postsLabel}>Posts:</Text>

        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.id} style={styles.tile}>
              <Text style={styles.tileLabel}>image</Text>
            </View>
          ))}
        </View>
      </ScrollView>

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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 12,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  settingsIcon: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 22,
    fontWeight: "900",
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  avatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 12 },

  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },

  followersText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
  },

  postsLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
    paddingBottom: 12,
  },

  tile: {
    width: "46%",
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.16 : 0.32,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },

  tileLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    fontWeight: "900",
  },
});