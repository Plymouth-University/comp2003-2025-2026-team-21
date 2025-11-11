import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useRouter, useLocalSearchParams } from "expo-router";


export default function EventFeed() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");

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

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        <View style={styles.dropdownWrapper}>
          <DropDownPicker
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={(callback) => {
              const val = callback(value);
              setValue(val);
              setSelectedDay(val ?? "Monday");
            }}
            setItems={setItems}
            placeholder="Select a day"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: "#333", fontWeight: "500" }}
            labelStyle={{ color: "#333" }}
            listMode="SCROLLVIEW"
            zIndex={1000}
            zIndexInverse={1000}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
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

      <View style={styles.bottomNav}>
        {["events", "tickets", "social"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.navButton,
              activeTab === tab && styles.navButtonActive,
            ]}
          >
            <Text
              style={[
                styles.navButtonText,
                activeTab === tab && styles.navButtonTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#380345ff",
    paddingTop: 40,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#110e47ff",
    paddingHorizontal: 16,
    paddingVertical: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#EEE",
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 45,
    color: "#000",
    marginRight: 10,
  },
  dropdownWrapper: {
    width: 150,
    zIndex: 1000,
  },
  dropdown: {
    backgroundColor: "#EEE",
    borderWidth: 0,
    borderRadius: 10,
  },
  dropdownContainer: {
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: "#FFF",
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
    backgroundColor: "#FFF",
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
    backgroundColor: "#060000ff",
    padding: 20,
    justifyContent: "space-around",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    backgroundColor: "#E5E5E5",
  },
  navButtonActive: {
    backgroundColor: "#007BFF",
  },
  navButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  navButtonTextActive: {
    color: "#FFF",
  },
});
