import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import FilterBar from "./components/FilterBar";
import BottomNav from "./components/BottomNav";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SocialStudent() {
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("social");
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
        placeholder="Select a day"
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Social feed for {selectedDay}</Text>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🤝 Study Group Meetup</Text>
          <Text style={styles.eventSubtext}>Posted by: Alex | Location: Library</Text>
        </View>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🎉 Society Social Tonight</Text>
          <Text style={styles.eventSubtext}>Posted by: Culture Club | Location: Union Bar</Text>
        </View>

        <View style={styles.eventItem}>
          <Text style={styles.eventText}>🧗 Weekend Climbing Trip</Text>
          <Text style={styles.eventSubtext}>Posted by: Outdoor Soc | Location: Off-campus</Text>
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
});
