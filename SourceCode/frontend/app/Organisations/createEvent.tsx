import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image as RNImage,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colours } from "../../lib/theme/colours";
import { createEvent } from "../../lib/eventsApi";
import { getCurrentUser } from "../../lib/postsApi";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function AddEventOrg() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);
  const [price, setPrice] = useState("£");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  const canConfirm = useMemo(() => {
    const hasPrice = price.replace(/[^0-9]/g, "").length > 0;
    return Boolean(title.trim() && eventDate && location.trim() && hasPrice);
  }, [title, eventDate, location, price]);

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
    if (!eventDate) {
      return "";
    }

    return eventDate.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [eventDate]);

  useEffect(() => {
    let isActive = true;

    const loadOrgLocation = async () => {
      if (locationTouched || location.trim()) {
        return;
      }

      try {
        const storedLocation = await SecureStore.getItemAsync("orgLocation");
        if (isActive && storedLocation && !locationTouched && !location.trim()) {
          setLocation(storedLocation);
        }

        const user = await getCurrentUser();
        if (
          isActive &&
          user?.role === "ORGANISATION" &&
          user.location &&
          !locationTouched &&
          !location.trim()
        ) {
          setLocation(user.location);
        }
      } catch {}
    };

    loadOrgLocation();

    return () => {
      isActive = false;
    };
  }, [locationTouched, location]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setRefreshing(false);
  }, []);

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
      setImageUri(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      Alert.alert("Missing fields", "Please fill in title, date, location and price.");
      return;
    }

    try {
      await createEvent({
        title: title.trim(),
        description: "",
        date: eventDate?.toISOString() ?? "",
        location: location.trim(),
        price: normalizePrice(price),
        imageUri,
      });

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.replace("/Organisations/createEvent") },
      ]);

      setTitle("");
      setEventDate(null);
      setLocation("");
      setLocationTouched(false);
      setPrice("£");
      setImageUri(null);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create event. Please try again."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colours.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/Organisations/profileOrg")}
          activeOpacity={0.85}
        >
          <View style={styles.profileCircle} />
          <Text style={styles.profileLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.imageCard}
            onPress={pickImage}
            activeOpacity={0.9}
          >
            {imageUri ? (
              <RNImage source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Text style={styles.imageText}>Add image</Text>
            )}
          </TouchableOpacity>

          <View style={styles.formRow}>
            <View style={styles.colLeft}>
              <TInput
                label="Add Event title"
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
              />
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Add Date</Text>
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
                    value={eventDate ?? new Date()}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS !== "ios") {
                        setShowDatePicker(false);
                      }

                      if (selectedDate) {
                        setEventDate(selectedDate);
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
              </View>
            </View>

            <View style={styles.colRight}>
              <TInput
                label="Add Location"
                value={location}
                onChangeText={(value) => {
                  setLocationTouched(true);
                  setLocation(value);
                }}
                placeholder="e.g. Student Union"
              />
              <TouchableOpacity
                style={styles.locationHintBtn}
                onPress={async () => {
                  try {
                    const storedLocation = await SecureStore.getItemAsync(
                      "orgLocation"
                    );
                    const user = await getCurrentUser();
                    const nextLocation =
                      storedLocation ||
                      (user?.role === "ORGANISATION" ? user.location : null);

                    if (nextLocation) {
                      setLocationTouched(true);
                      setLocation(nextLocation);
                    }
                  } catch {}
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.locationHintText}>Use org location</Text>
              </TouchableOpacity>
              <TInput
                label="Add Price"
                value={price}
                onChangeText={(value) => setPrice(formatPriceDisplay(value))}
                onBlur={() => setPrice(normalizePrice(price))}
                placeholder="e.g. £10.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={!canConfirm}
          >
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TInput(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={props.value}
        onChangeText={props.onChangeText}
        onBlur={props.onBlur}
        placeholder={props.placeholder}
        placeholderTextColor={colours.textMuted}
        autoCapitalize="none"
        keyboardType={props.keyboardType ?? "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },

  dateInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.glass,
    justifyContent: "center",
  },

  dateInputText: {
    color: colours.textPrimary,
    fontSize: 15,
  },

  datePlaceholder: {
    color: colours.textMuted,
  },

  dateDoneBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },

  dateDoneText: {
    color: colours.textPrimary,
    fontWeight: "700",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colours.border,
  },
  searchInput: {
    flex: 1,
    color: colours.textPrimary,
    fontSize: 15,
    paddingRight: 10,
  },
  searchIcon: {
    color: colours.textSecondary,
    fontSize: 18,
    marginLeft: 8,
  },

  profileBtn: {
    width: 64,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },
  profileCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 1,
  },
  profileLabel: {
    color: colours.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },

  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },

  locationHintBtn: {
    alignSelf: "flex-start",
    marginTop: -6,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },

  locationHintText: {
    color: colours.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.14 : 0.34,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 6,
  },

  imageCard: {
    height: 210,
    borderRadius: 22,
    backgroundColor: colours.success,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageText: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 18,
    fontWeight: "900",
  },

  formRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 14,
  },

  colLeft: {
    flex: 1,
  },
  colRight: {
    flex: 1,
  },

  fieldWrap: {
    marginBottom: 10,
  },

  fieldLabel: {
    color: colours.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  fieldInput: {
    backgroundColor: colours.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colours.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colours.border,
  },

  confirmBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: colours.primary,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.16 : 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
});