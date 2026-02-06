import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
} from "react-native";
import FilterBar from "./components/FilterBar";
import BottomNav from "./components/BottomNav";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colours } from "../lib/theme/colours";

export default function MyTickets() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tickets");
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [items, setItems] = useState([
    { label: "Monday", value: "Monday" },
    { label: "Tuesday", value: "Tuesday" },
    { label: "Wednesday", value: "Wednesday" },
    { label: "Thursday", value: "Thursday" },
    { label: "Friday", value: "Friday" },
    { label: "Saturday", value: "Saturday" },
    { label: "Sunday", value: "Sunday" },
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 800));
    setRefreshing(false);
  }, []);

  const bottomPad = 100 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedValue={value}
        onSelectValue={(val) => {
          setValue(val);
          setSelectedDay(val ?? "Monday");
        }}
        open={open}
        setOpen={setOpen}
        items={items}
        setItems={setItems}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colours.textSecondary}
          />
        }
      >
        <Text style={styles.sectionTitle}>Events on {selectedDay}</Text>

        <View style={styles.ticketItem}>
          <Text style={styles.ticketTitle}>🎟️ Open Mic Night</Text>
          <Text style={styles.ticketMeta}>Location: Campus Café</Text>
        </View>

        <View style={styles.ticketItem}>
          <Text style={styles.ticketTitle}>🎮 Gaming Society Meetup</Text>
          <Text style={styles.ticketMeta}>Location: Student Union</Text>
        </View>

        <View style={styles.ticketItem}>
          <Text style={styles.ticketTitle}>🏐 Volleyball Tournament</Text>
          <Text style={styles.ticketMeta}>Location: Sports Hall</Text>
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
            if (tab === "social") router.push("/socialStudent");
            if (tab === "tickets") router.replace("/myTickets");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },

  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colours.textSecondary,
    marginBottom: 10,
  },

  ticketItem: {
    backgroundColor: colours.surface,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.32,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 10,
  },

  ticketTitle: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  ticketMeta: {
    color: colours.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});