import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import FilterBar from "../components/FilterBar";
import EventCard from "../components/EventCard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { clearSession } from "../../lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";
import { useTabRefresh } from "../hooks/useTabRefresh";
import MapView, { Marker } from "react-native-maps";
import { geocodeLocation } from "../../lib/staticMaps";
import {
  getMyEvents,
  EventRecord,
  updateEvent,
  deleteEvent,
} from "../../lib/eventsApi";
import { useTickets } from "../../contexts/TicketsContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";

type EventItem = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  dateISO: string;
  location: string;
  price: string;
  mapLocation: string;
  eventImageUrl: string | null;
  ticketCount: number;
  capacity?: number | null;
  date: Date;
};

export default function EventsOrg() {
  const [selectedDay, setSelectedDay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [mapCoords, setMapCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editPrice, setEditPrice] = useState("£");
  const [editCapacity, setEditCapacity] = useState("");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [items, setItems] = useState([
    { label: "All Events", value: "All" },
    { label: "Today", value: "Today" },
    { label: "This Week", value: "This Week" },
    { label: "This Month", value: "This Month" },
  ]);

  const canSave = useMemo(() => {
    const hasPrice = editPrice.replace(/[^0-9]/g, "").length > 0;
    return Boolean(
      editTitle.trim() && editDate && editLocation.trim() && hasPrice,
    );
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

  const router = useRouter();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getMyEvents();
      setEvents(data);
    } catch (err: any) {
      if (
        err.name === "AuthError" ||
        (err.message && err.message.toLowerCase().includes("token"))
      ) {
        await clearSession();
        router.replace("/");
      }
      throw err;
    }
  }, [router]);

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

        // Format price for display - convert Decimal to currency string
        const priceNum =
          typeof event.price === "number"
            ? event.price
            : parseFloat(String(event.price)) || 0;
        const formattedPrice = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(priceNum);

        return {
          id: event.id,
          title: event.title,
          description: event.description ?? "",
          dateLabel,
          dateLabelDate,
          dateLabelTime,
          dateISO: event.date,
          location: event.location,
          price: formattedPrice,
          mapLocation: event.location,
          eventImageUrl: event.eventImageUrl,
          ticketCount: event.ticketCount ?? 0,
          capacity: event.capacity,
          date: eventDate,
        };
      }),
    [events],
  );

  const visibleEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return eventItems.filter((e) => {
      let matchesDate = true;
      const eventDate = e.date;

      if (selectedDay === "Today") {
        matchesDate = eventDate >= startOfToday && eventDate <= endOfToday;
      } else if (selectedDay === "This Week") {
        matchesDate = eventDate >= startOfWeek && eventDate <= endOfWeek;
      } else if (selectedDay === "This Month") {
        matchesDate = eventDate >= startOfMonth && eventDate <= endOfMonth;
      }

      const matchesSearch =
        searchQuery.length === 0 ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesSearch;
    });
  }, [eventItems, selectedDay, searchQuery]);

  const mapUrl = selectedEvent
    ? `maps://?q=${encodeURIComponent(selectedEvent.mapLocation)}`
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
    setEditCapacity(
      selectedEvent.capacity != null ? String(selectedEvent.capacity) : "",
    );
    setEditImageUri(null);
  }, [selectedEvent]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedEvent) {
      setMapCoords(null);
      return;
    }

    geocodeLocation(selectedEvent.mapLocation).then((coords) => {
      if (!cancelled) {
        setMapCoords(coords);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  const renderEvent = useCallback(({ item: ev }: { item: EventItem }) => {
    const handleEventPress = () => {
      setSelectedEvent(ev);
    };

    return (
      <EventCard
        id={ev.id}
        title={ev.title}
        dateLabelDate={ev.dateLabelDate}
        dateLabelTime={ev.dateLabelTime}
        price={ev.price}
        eventImageUrl={ev.eventImageUrl}
        ticketCount={ev.ticketCount}
        capacity={ev.capacity}
        onPress={handleEventPress}
      />
    );
  }, []);

  const keyExtractor = useCallback((item: EventItem) => item.id, []);

  const renderSectionTitle = useMemo(
    () => (
      <Text style={styles.sectionTitle}>
        {selectedDay === "All" ? "All events" : selectedDay}
      </Text>
    ),
    [selectedDay],
  );

  const resetEditFields = useCallback(() => {
    if (!selectedEvent) {
      return;
    }

    setEditTitle(selectedEvent.title);
    setEditDescription(selectedEvent.description);
    setEditLocation(selectedEvent.location);
    // Format price for editing - strip currency symbol and convert to editable format
    const priceStr = selectedEvent.price.replace(/[^0-9.]/g, "");
    setEditPrice(priceStr ? `£${priceStr}` : "£");
    setEditDate(selectedEvent.dateISO ? new Date(selectedEvent.dateISO) : null);
    setEditCapacity(
      selectedEvent.capacity != null ? String(selectedEvent.capacity) : "",
    );
    setEditImageUri(null);
  }, [selectedEvent]);

  const closeModal = () => {
    Keyboard.dismiss();
    setShowDatePicker(false);
    setIsEditing(false);
    setSelectedEvent(null);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library.",
      );
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
      Alert.alert(
        "Missing fields",
        "Please fill in title, date, location and price.",
      );
      return;
    }

    try {
      // Convert price string to number for Decimal type
      const priceString = normalizePrice(editPrice);
      const priceNumber = parseFloat(priceString.replace(/[^0-9.]/g, "")) || 0;

      await updateEvent({
        id: selectedEvent.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        date: editDate?.toISOString() ?? "",
        location: editLocation.trim(),
        price: priceNumber,
        capacity: editCapacity ? parseInt(editCapacity, 10) : null,
        imageUri: editImageUri,
      });

      await fetchEvents();
      closeModal();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update event.");
    }
  };

  const { removeTicketsForEvent } = useTickets();

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
            await removeTicketsForEvent(selectedEvent.id);
            await fetchEvents();
            closeModal();
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
        placeholder="Filter"
      />

      <FlatList
        data={visibleEvents}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderSectionTitle}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
      />

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalCenterWrap}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHandle} />

                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {selectedEvent?.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setSelectedEvent(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {isEditing ? (
                      <View style={styles.editSection}>
                        <Text style={styles.editLabel}>Title</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          placeholder="Event title"
                          placeholderTextColor={colours.textMuted}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <Text style={styles.editLabel}>Date</Text>
                        <TouchableOpacity
                          style={styles.dateInput}
                          onPress={() => {
                            Keyboard.dismiss();
                            setShowDatePicker(true);
                          }}
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
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
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
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <Text style={styles.editLabel}>Price</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editPrice}
                          onChangeText={(value) =>
                            setEditPrice(formatPriceDisplay(value))
                          }
                          onBlur={() => setEditPrice(normalizePrice(editPrice))}
                          placeholder="e.g. £10.00"
                          placeholderTextColor={colours.textMuted}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <Text style={styles.editLabel}>
                          Ticket Capacity (Optional)
                        </Text>
                        <TextInput
                          style={styles.editInput}
                          value={editCapacity}
                          onChangeText={setEditCapacity}
                          placeholder="Leave empty for unlimited"
                          placeholderTextColor={colours.textMuted}
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <Text style={styles.editLabel}>Description</Text>
                        <TextInput
                          style={[styles.editInput, styles.editTextArea]}
                          value={editDescription}
                          onChangeText={setEditDescription}
                          placeholder="Description"
                          placeholderTextColor={colours.textMuted}
                          multiline
                          textAlignVertical="top"
                        />

                        <Text style={styles.editLabel}>Event image</Text>
                        <TouchableOpacity
                          style={styles.imagePickBtn}
                          onPress={() => {
                            Keyboard.dismiss();
                            pickImage();
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.imagePickText}>
                            {editImageUri ? "Image selected" : "Change image"}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.editPreviewFrame}>
                          {editImageUri ? (
                            <Image
                              source={{ uri: editImageUri }}
                              style={styles.editPreviewImage}
                            />
                          ) : selectedEvent?.eventImageUrl ? (
                            <Image
                              source={{ uri: selectedEvent.eventImageUrl }}
                              style={styles.editPreviewImage}
                            />
                          ) : (
                            <View style={styles.mapFallback}>
                              <Text style={styles.eventImageText}>image</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.modalMeta}>
                          {selectedEvent?.dateLabel}
                        </Text>
                        <Text style={styles.modalMeta}>
                          {selectedEvent?.location}
                        </Text>
                        <Text style={styles.modalMeta}>
                          {selectedEvent?.price}
                        </Text>
                        <Text style={styles.modalMeta}>
                          {selectedEvent?.capacity !== null &&
                          selectedEvent?.capacity !== undefined
                            ? `${selectedEvent.ticketCount}/${selectedEvent.capacity} tickets`
                            : `${selectedEvent?.ticketCount} ${selectedEvent?.ticketCount === 1 ? "ticket" : "tickets"} booked`}
                        </Text>
                        {selectedEvent?.description ? (
                          <Text style={styles.modalMeta}>
                            {selectedEvent.description}
                          </Text>
                        ) : null}

                        <View style={styles.mapFrame}>
                          {mapCoords ? (
                            <MapView
                              style={styles.mapWebView}
                              initialRegion={{
                                latitude: mapCoords.lat,
                                longitude: mapCoords.lon,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                              }}
                              scrollEnabled={false}
                              zoomEnabled={false}
                              pitchEnabled={false}
                              rotateEnabled={false}
                            >
                              <Marker
                                coordinate={{
                                  latitude: mapCoords.lat,
                                  longitude: mapCoords.lon,
                                }}
                                title={selectedEvent?.location}
                              />
                            </MapView>
                          ) : (
                            <View style={styles.mapFallback}>
                              <ActivityIndicator
                                size="small"
                                color={colours.textMuted}
                              />
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </ScrollView>

                  {isEditing ? (
                    <View style={styles.actionRowSticky}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionPrimary]}
                        onPress={handleSave}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[styles.actionText, styles.actionTextInverse]}
                        >
                          Save
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowDatePicker(false);
                          resetEditFields();
                          setIsEditing(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.actionText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.actionRowSticky}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionPrimary]}
                        onPress={() => setIsEditing(true)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[styles.actionText, styles.actionTextInverse]}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionDanger]}
                        onPress={handleDelete}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[styles.actionText, styles.actionTextInverse]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isEditing && selectedEvent && (
                    <>
                      <TouchableOpacity
                        style={[styles.openMapBtn, styles.scanBtn]}
                        onPress={() => {
                          setSelectedEvent(null);
                          router.push(
                            `/Organisations/scanTickets?eventId=${selectedEvent.id}&eventTitle=${encodeURIComponent(selectedEvent.title)}` as any,
                          );
                        }}
                      >
                        <Ionicons
                          name="scan-outline"
                          size={20}
                          color={colours.surface}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.openMapText}>Scan Tickets</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.openMapBtn}
                        onPress={() => Linking.openURL(mapUrl)}
                      >
                        <Text style={styles.openMapText}>Open in Maps</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  modalCenterWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "92%",
    maxWidth: 500,
    maxHeight: "88%",
    backgroundColor: colours.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.2 : 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignSelf: "center",
    marginBottom: 14,
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

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  editSection: {
    gap: 2,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colours.textPrimary,
  },

  editTextArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  dateInput: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
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
    marginTop: 8,
    minHeight: 46,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: "center",
    justifyContent: "center",
  },

  imagePickText: {
    color: colours.textPrimary,
    fontWeight: "700",
  },

  editPreviewFrame: {
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 12,
    backgroundColor: colours.background,
  },

  editPreviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  mapFrame: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 12,
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
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colours.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  scanBtn: {
    backgroundColor: colours.success,
  },

  openMapText: {
    color: colours.surface,
    fontWeight: "700",
  },

  actionRowSticky: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
  },

  actionButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: "center",
    justifyContent: "center",
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
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.primary,
    borderWidth: 1,
    borderColor: colours.border,
  },

  modalCloseText: {
    fontSize: 18,
    fontWeight: "700",
    color: colours.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
