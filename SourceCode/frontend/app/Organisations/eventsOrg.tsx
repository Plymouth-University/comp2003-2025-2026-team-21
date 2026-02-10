import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  Image,
  TextInput,
  Alert,
} from "react-native";
import FilterBar from "../components/FilterBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";
import { useTabRefresh } from "../hooks/useTabRefresh";
import { getStaticMapUrl } from "../../lib/staticMaps";
import { getMyEvents, EventRecord, updateEvent, deleteEvent } from "../../lib/eventsApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";


type EventItem = {
  id: string;
  day: string;
  title: string;
  description: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  dateISO: string;
  location: string;
  price: string;
  mapLocation: string;
  image: string | null;
  imageMimeType: string | null;
};

export default function EventsOrg() {
  const [selectedDay, setSelectedDay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [modalMapUrl, setModalMapUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editPrice, setEditPrice] = useState("£");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
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

  const canSave = useMemo(() => {
    const hasPrice = editPrice.replace(/[^0-9]/g, "").length > 0;
    return Boolean(editTitle.trim() && editDate && editLocation.trim() && hasPrice);
  }, [editTitle, editDate, editLocation, editPrice]);

  const formatPriceDisplay = (rawValue: string) => {
    const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
    if (!cleaned) {
      return "£";
    }

    const parts = cleaned.split(".");
    const whole = parts[0] || "0";
    const fractional = parts.slice(1).join("").slice(0, 2);
    const hasDot = parts.length > 1;

    return `£${whole}${hasDot ? "." + fractional : ""}`;
  };

  const normalizePrice = (rawValue: string) => {
    const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
    if (!cleaned || cleaned === ".") {
      return "£0.00";
    }

    const parts = cleaned.split(".");
    const whole = parts[0] || "0";
    const fractional = (parts[1] || "").padEnd(2, "0").slice(0, 2);

    return `£${whole}.${fractional}`;
  };

  const formattedDate = useMemo(() => {
    if (!editDate) {
      return "";
    }

    return editDate.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [editDate]);

  const fetchEvents = useCallback(async () => {
    const data = await getMyEvents();
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
      console.warn("Failed to fetch organiser events:", error);
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
          description: event.description ?? "",
          dateLabel,
          dateLabelDate,
          dateLabelTime,
          dateISO: event.date,
          location: event.location,
          price: event.price,
          mapLocation: event.organiser.location ?? event.location,
          image: event.eventImage,
          imageMimeType: event.eventImageMimeType,
        };
      }),
    [events, dayNames]
  );

  const visibleEvents = eventItems.filter(
    (e) =>
      (selectedDay === "All" || e.day === selectedDay) &&
      (e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const mapUrl = selectedEvent
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        selectedEvent.mapLocation
      )}`
    : "";

  useEffect(() => {
    if (!selectedEvent) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    setEditTitle(selectedEvent.title);
    setEditDescription(selectedEvent.description);
    setEditLocation(selectedEvent.location);
    setEditPrice(selectedEvent.price);
    setEditDate(selectedEvent.dateISO ? new Date(selectedEvent.dateISO) : null);
    setEditImageUri(null);
  }, [selectedEvent]);

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

  const resetEditFields = useCallback(() => {
    if (!selectedEvent) {
      return;
    }

    setEditTitle(selectedEvent.title);
    setEditDescription(selectedEvent.description);
    setEditLocation(selectedEvent.location);
    setEditPrice(selectedEvent.price);
    setEditDate(selectedEvent.dateISO ? new Date(selectedEvent.dateISO) : null);
    setEditImageUri(null);
  }, [selectedEvent]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!selectedEvent) {
      return;
    }

    if (!canSave) {
      Alert.alert("Missing fields", "Please fill in title, date, location and price.");
      return;
    }

    try {
      await updateEvent({
        id: selectedEvent.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        date: editDate?.toISOString() ?? "",
        location: editLocation.trim(),
        price: normalizePrice(editPrice),
        imageUri: editImageUri,
      });

      await fetchEvents();
      setSelectedEvent(null);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update event.");
    }
  };

  const handleDelete = () => {
    if (!selectedEvent) {
      return;
    }

    Alert.alert("Delete event?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(selectedEvent.id);
            await fetchEvents();
            setSelectedEvent(null);
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete event.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedValue={value}
        onSelectValue={(val) => {
          setValue(val);
          setSelectedDay(val ?? "All");
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

            {isEditing ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Title</Text>
                <TextInput
                  style={styles.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Event title"
                  placeholderTextColor={colours.textMuted}
                />

                <Text style={styles.editLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      !formattedDate && styles.datePlaceholder,
                    ]}
                  >
                    {formattedDate || "Select date and time"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={editDate ?? new Date()}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS !== "ios") {
                        setShowDatePicker(false);
                      }

                      if (selectedDate) {
                        setEditDate(selectedDate);
                      }
                    }}
                  />
                )}

                {Platform.OS === "ios" && showDatePicker && (
                  <TouchableOpacity
                    style={styles.dateDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dateDoneText}>Done</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.editLabel}>Location</Text>
                <TextInput
                  style={styles.editInput}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Location"
                  placeholderTextColor={colours.textMuted}
                />

                <Text style={styles.editLabel}>Price</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPrice}
                  onChangeText={(value) => setEditPrice(formatPriceDisplay(value))}
                  onBlur={() => setEditPrice(normalizePrice(editPrice))}
                  placeholder="e.g. £10.00"
                  placeholderTextColor={colours.textMuted}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.editLabel}>Description</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Description"
                  placeholderTextColor={colours.textMuted}
                  multiline
                />

                <TouchableOpacity
                  style={styles.imagePickBtn}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  <Text style={styles.imagePickText}>
                    {editImageUri ? "Image selected" : "Change image"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalMeta}>{selectedEvent?.dateLabel}</Text>
                <Text style={styles.modalMeta}>{selectedEvent?.location}</Text>
                <Text style={styles.modalMeta}>{selectedEvent?.price}</Text>
                {selectedEvent?.description ? (
                  <Text style={styles.modalMeta}>{selectedEvent.description}</Text>
                ) : null}
              </>
            )}

            <View style={styles.mapFrame}>
              {modalMapUrl ? (
                <Image source={{ uri: modalMapUrl }} style={styles.mapWebView} />
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.eventImageText}>image</Text>
                </View>
              )}
            </View>

            {isEditing ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={handleSave}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionText, styles.actionTextInverse]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    resetEditFields();
                    setIsEditing(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionText, styles.actionTextInverse]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDanger]}
                  onPress={handleDelete}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionText, styles.actionTextInverse]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

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

  editSection: {
    marginBottom: 8,
  },

  editLabel: {
    color: colours.textMuted,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },

  editInput: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colours.textPrimary,
  },

  editTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  dateInput: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  dateInputText: {
    color: colours.textPrimary,
    fontWeight: "700",
  },

  datePlaceholder: {
    color: colours.textMuted,
  },

  dateDoneBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colours.primary,
  },

  dateDoneText: {
    color: colours.surface,
    fontWeight: "700",
  },

  imagePickBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: "center",
  },

  imagePickText: {
    color: colours.textPrimary,
    fontWeight: "700",
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

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: "center",
  },

  actionPrimary: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },

  actionDanger: {
    backgroundColor: colours.warning,
    borderColor: colours.warning,
  },

  actionText: {
    color: colours.textPrimary,
    fontWeight: "700",
  },

  actionTextInverse: {
    color: colours.surface,
    fontWeight: "700",
  },
});