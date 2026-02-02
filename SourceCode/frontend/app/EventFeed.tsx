import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import FilterBar from "./components/FilterBar";
import BottomNav from "./components/BottomNav";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function EventFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 8, 12); 

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
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]} edges={["top"]}>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
          if (tab === activeTab) {
            handleRefresh();
          } else {
            setActiveTab(tab);
            if (tab === "events") router.replace("/EventFeed");
            if (tab === "tickets") router.push("/myTickets");
            if (tab === "social") router.push("/socialStudent");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3c0303ff",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    color: "#fff",
    marginRight: 10,
  },
  dropdownWrapper: {
    width: 150,
    zIndex: 1000,
  },
  dropdown: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,
    borderRadius: 10,
  },
  dropdownContainer: {
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    elevation: 5,
    zIndex: 1000,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#b8b3b3ff",
    marginBottom: 10,
  },
  eventItem: {
    backgroundColor: "#bf9a9aff",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 10,
  },
  eventText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  eventSubtext: {
    color: "#555",
    fontSize: 14,
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    backgroundColor: "#3e0202ff",
    height: 64,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    borderRadius: 0,
    marginHorizontal: 0,
    backgroundColor: "transparent",
  },
  navButtonActive: {
    backgroundColor: "#2e0101ff",
  },
  navButtonText: {
    color: "#555454ff",
    fontWeight: "600",
  },
  navButtonTextActive: {
    color: "#FFF",
  },
  navButtonSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
  },
});
