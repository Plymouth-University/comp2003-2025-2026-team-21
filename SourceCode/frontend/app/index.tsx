import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";



export default function Index() {
  const router = useRouter();
  useEffect(() => {
  Asset.fromModule(require("../assets/images/Space.png")).downloadAsync();
}, []);

  return (
    <ImageBackground
      source={require("../assets/images/Space.png")}
      style={styles.container}
      imageStyle={{ resizeMode: "cover" }}
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.content} edges={["top"]}>
        <Text style={styles.title}>UniVerse</Text>
        <Text style={styles.subtitle}>Choose how you want to sign in</Text>

        <TouchableOpacity
          style={[styles.btn, styles.studentBtn]}
          onPress={() => router.push("../auth/loginStudent")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Login as Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.orgBtn]}
          onPress={() => router.push("../auth/loginOrg")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Login as Organisation</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 44,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 36,
  },
  btn: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  studentBtn: { backgroundColor: "#00c853" },
  orgBtn: { backgroundColor: "#7a46ff" },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});