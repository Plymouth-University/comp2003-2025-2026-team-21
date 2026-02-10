import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
} from "react-native";
import FilterBar from "../components/FilterBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";
import { useTabRefresh } from "../hooks/useTabRefresh";
import { getEvents, EventRecord } from "../../lib/eventsApi";
import { getStaticMapUrl } from "../../lib/staticMaps";

type EventItem = {
  id: string;
  day: string;
  title: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  location: string;
  price: string;
  image: string | null;
  imageMimeType: string | null;
  mapLocation: string;
};

export default function EventFeed() {

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [modalMapUrl, setModalMapUrl] = useState<string | null>(null);
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
        const dateLabelDate = isValidDate
          ? eventDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
            })
          : "TBD";
        const dateLabelTime = isValidDate
          ? eventDate
              .toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .replace(" ", "")
          : "";
        const dateLabel = dateLabelTime
          ? `${dateLabelDate} ${dateLabelTime}`
          : dateLabelDate;

        return {
          id: event.id,
          day: dayName,
          title: event.title,
          dateLabel,
          dateLabelDate,
          dateLabelTime,
          location: event.location,
          price: event.price,
          image: event.eventImage,
          imageMimeType: event.eventImageMimeType,
          mapLocation: event.organiser.location ?? event.location,
        };
      }),
    [events]
  );

  const visibleEvents =
    selectedDay === "All"
      ? eventItems
      : eventItems.filter((e) => e.day === selectedDay);

  const mapUrl = selectedEvent
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        selectedEvent.mapLocation
      )}`
    : "";

  useEffect(() => {
    let cancelled = false;

    if (!selectedEvent) {
      setModalMapUrl(null);
      return;
    }

    getStaticMapUrl(selectedEvent.mapLocation).then((url) => {
      if (!cancelled) {
        setModalMapUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);


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

        {visibleEvents.map((ev) => {
          return (
            <Pressable
              key={ev.id}
              style={styles.eventCard}
              onPress={() => setSelectedEvent(ev)}
            >
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
                  {ev.dateLabelDate}
                </Text>
                {ev.dateLabelTime ? (
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {ev.dateLabelTime}
                  </Text>
                ) : null}
              </View>

              <View style={styles.eventRight}>
                <Text style={styles.eventMetaRight} numberOfLines={1}>
                  {ev.price}
                </Text>
              </View>
            </View>
            </Pressable>
          );
        })}
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

            <Text style={styles.modalMeta}>{selectedEvent?.dateLabel}</Text>
            <Text style={styles.modalMeta}>{selectedEvent?.location}</Text>
            <Text style={styles.modalMeta}>{selectedEvent?.price}</Text>

            <View style={styles.mapFrame}>
              {modalMapUrl ? (
                <Image source={{ uri: modalMapUrl }} style={styles.mapWebView} />
              ) : selectedEvent?.image ? (
                <Image
                  source={{
                    uri: `data:${selectedEvent.imageMimeType ?? "image/jpeg"};base64,${selectedEvent.image}`,
                  }}
                  style={styles.mapWebView}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.eventImageText}>image</Text>
                </View>
              )}
            </View>

            {selectedEvent && (
              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => Linking.openURL(mapUrl)}
              >
                <Text style={styles.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    minWidth: 90,
  },

  eventTitle: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  eventMeta: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },

  eventMetaRight: {
    color: colours.textPrimary,
    fontSize: 14,
    fontWeight: "800",
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

  mapWebView: {
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
});