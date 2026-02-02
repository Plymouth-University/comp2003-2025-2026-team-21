import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { usePosts } from "./contexts/PostsContext";

export default function CreatePost() {
  const router = useRouter();
  const { addPost } = usePosts();
  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!imageUri) {
      Alert.alert("No Image", "Please select or take a photo first.");
      return;
    }

    if (!caption.trim()) {
      Alert.alert("No Caption", "Please add a caption to your post.");
      return;
    }

    try {
      await addPost(caption, imageUri);
      Alert.alert("Success", "Post created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create post. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.removeImageIcon}>×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.imageBtn}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Text style={styles.imageBtnIcon}>🖼️</Text>
            <Text style={styles.imageBtnText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageBtn}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.imageBtnIcon}>📸</Text>
            <Text style={styles.imageBtnText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.captionSection}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {caption.length}/500
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.postBtn, (!imageUri || !caption.trim()) && styles.postBtnDisabled]}
          onPress={handlePost}
          activeOpacity={0.8}
          disabled={!imageUri || !caption.trim()}
        >
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3c0303ff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  headerSpacer: {
    width: 40,
  },

  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },

  imageSection: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  imagePreview: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  removeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageIcon: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  imagePlaceholder: {
    height: 300,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  imageBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.15 : 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  imageBtnIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  captionSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  charCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "right",
    marginTop: 6,
  },

  postBtn: {
    backgroundColor: "#00c853",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#00c853",
    shadowOpacity: Platform.OS === "ios" ? 0.4 : 0.6,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  postBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.15)",
    shadowOpacity: 0,
  },
  postBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
});
