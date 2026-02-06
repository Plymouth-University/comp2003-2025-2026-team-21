import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, Platform, StyleSheet } from "react-native";
import FilterBar from "../components/FilterBar";
import BottomNav from "../components/BottomNav";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";

export default function EventFeed() {
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");
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
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.sectionTitle}>Events on {selectedDay}</Text>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🎟️ Open Mic Night</Text>
          <Text style={styles.eventSubtext}>Location: Campus Café</Text>
        </View>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🎮 Gaming Society Meetup</Text>
          <Text style={styles.eventSubtext}>Location: Student Union</Text>
        </View>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🏐 Volleyball Tournament</Text>
          <Text style={styles.eventSubtext}>Location: Sports Hall</Text>
        </View>
      </ScrollView>

      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          if (tab === activeTab) handleRefresh();
          else {
            setActiveTab(tab);
            if (tab === "events") router.replace("/Students/EventFeed");
            if (tab === "tickets") router.push("/Students/myTickets");
            if (tab === "social") router.push("/Students/socialStudent");
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
    marginBottom: Spacing.sm,
  },
  eventItem: {
    backgroundColor: colours.surface,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 10,
  },
  eventText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  eventSubtext: {
    color: colours.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});