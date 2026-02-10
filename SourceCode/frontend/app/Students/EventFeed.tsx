import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import FilterBar from "../components/FilterBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";
import { useTabRefresh } from "../hooks/useTabRefresh";
import { getEvents, EventRecord } from "../../lib/eventsApi";

type EventItem = {
  id: string;
  day: string;
  title: string;
  dateLabel: string;
  location: string;
  price: string;
  image: string | null;
  imageMimeType: string | null;
};

export default function EventFeed() {

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [items, setItems] = useState([
    { label: "All", value: "All" },
    { label: "Monday", value: "Monday" },
    { label: "Tuesday", value: "Tuesday" },
    { label: "Wednesday", value: "Wednesday" },
    { label: "Thursday", value: "Thursday" },
    { label: "Friday", value: "Friday" },
    { label: "Saturday", value: "Saturday" },
    { label: "Sunday", value: "Sunday" },
  ]);

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const fetchEvents = useCallback(async () => {
    const data = await getEvents();
    setEvents(data);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchEvents();
    } finally {
      setRefreshing(false);
    }
  }, [fetchEvents]);
   useTabRefresh(handleRefresh);

  useEffect(() => {
    fetchEvents().catch((error) => {
      console.warn("Failed to fetch events:", error);
    });
  }, [fetchEvents]);

  const eventItems: EventItem[] = useMemo(
    () =>
      events.map((event) => {
        const eventDate = new Date(event.date);
        const isValidDate = !Number.isNaN(eventDate.getTime());
        const dayName = isValidDate ? dayNames[eventDate.getDay()] : "Monday";
        const dateLabel = isValidDate
          ? `${eventDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
            })} ${eventDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`
          : "TBD";

        return {
          id: event.id,
          day: dayName,
          title: event.title,
          dateLabel,
          location: event.location,
          price: event.price,
          image: event.eventImage,
          imageMimeType: event.eventImageMimeType,
        };
      }),
    [events]
  );

  const visibleEvents =
    selectedDay === "All"
      ? eventItems
      : eventItems.filter((e) => e.day === selectedDay);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>
          {selectedDay === "All" ? "All events" : `Events on ${selectedDay}`}
        </Text>

        {visibleEvents.map((ev) => (
          <View key={ev.id} style={styles.eventCard}>
            <View style={styles.eventImage}>
              {ev.image ? (
                <Image
                  source={{
                    uri: `data:${ev.imageMimeType ?? "image/jpeg"};base64,${ev.image}`,
                  }}
                  style={styles.eventImageFill}
                />
              ) : (
                <Text style={styles.eventImageText}>image</Text>
              )}
            </View>

            <View style={styles.eventInfoRow}>
              <View style={styles.eventLeft}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {ev.dateLabel}
                </Text>
              </View>

              <View style={styles.eventRight}>
                <Text style={styles.eventMetaRight} numberOfLines={1}>
                  {ev.location}
                </Text>
                <Text style={styles.eventMetaRight} numberOfLines={1}>
                  {ev.price}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      
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

  eventCard: {
    backgroundColor: colours.surface,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.32,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: Spacing.sm,
  },

  eventImage: {
    height: 190,
    borderRadius: 18,
    backgroundColor: colours.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },

  eventImageFill: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  eventImageText: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 18,
    fontWeight: "800",
  },

  eventInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  eventLeft: {
    flex: 1,
    minWidth: 0,
  },

  eventRight: {
    alignItems: "flex-end",
    minWidth: 110,
  },

  eventTitle: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  eventMeta: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },

  eventMetaRight: {
    color: colours.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
});