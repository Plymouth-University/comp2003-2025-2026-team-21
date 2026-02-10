import React, { useMemo, useState, useCallback } from "react";
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
import { colours } from "../../lib/theme/colours";

export default function AddEventOrg() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  const canConfirm = useMemo(() => {
    return title.trim() && date.trim() && location.trim() && price.trim();
  }, [title, date, location, price]);

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

    Alert.alert("Created (placeholder)", "Wire this up to your backend create-event endpoint later.");
    setTitle("");
    setDate("");
    setLocation("");
    setPrice("");
    setImageUri(null);
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
              <TInput
                label="Add Date"
                value={date}
                onChangeText={setDate}
                placeholder="e.g. Fri 19:00"
              />
            </View>

            <View style={styles.colRight}>
              <TInput
                label="Add Location"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Student Union"
              />
              <TInput
                label="Add Price"
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. £5"
                keyboardType="default"
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
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={props.value}
        onChangeText={props.onChangeText}
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