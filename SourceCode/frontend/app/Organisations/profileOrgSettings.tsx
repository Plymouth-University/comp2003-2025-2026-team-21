import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";

const ProfileOrgSettings: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Organisation Settings</Text>
        <Text style={styles.subText}>Coming soon.</Text>
      </View>
    </SafeAreaView>
  );
};

export default ProfileOrgSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colours.textPrimary,
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    fontWeight: "600",
    color: colours.textSecondary,
  },
});
