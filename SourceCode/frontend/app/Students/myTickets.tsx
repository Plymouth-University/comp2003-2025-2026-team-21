import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
} from "react-native";
import FilterBar from "../components/FilterBar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { useTickets, Ticket } from "../../contexts/TicketsContext";

export default function MyTickets() {
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [fullscreenQR, setFullscreenQR] = useState(false);
  const [fullscreenQRTicket, setFullscreenQRTicket] = useState<Ticket | null>(null);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
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

  const { tickets } = useTickets();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 800));
    setRefreshing(false);
  }, []);

  const bottomPad = 100 + Math.max(insets.bottom, 0);

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
        contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colours.textSecondary}
          />
        }
      >
        <Text style={styles.sectionTitle}>
          {selectedDay === "All" ? "All tickets" : `Events on ${selectedDay}`}
        </Text>

        {tickets
          .filter((t) => {
            if (selectedDay === "All") return true;
            return t.day === selectedDay;
          })
          .map((t) => {
            return (
              <Pressable
                key={t.id}
                style={styles.ticketItem}
                onPress={() => setSelectedTicket(t)}
              >
                <Text style={styles.ticketTitle}>{t.title}</Text>
                <Text style={styles.ticketMeta}>{`${
                  t.dateLabelDate
                } ${t.dateLabelTime}`}</Text>
                <Text style={styles.ticketMeta}>{`Location: ${t.location}`}</Text>
                <Text style={styles.ticketMeta}>{`Price: ${t.price}`}</Text>
              </Pressable>
            );
          })}
      </ScrollView>

      {/* Modal for ticket details */}
      <Modal
        visible={Boolean(selectedTicket)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedTicket(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => null}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTicket?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMeta}>{selectedTicket?.dateLabel}</Text>
            <Text style={styles.modalMeta}>{selectedTicket?.location}</Text>
            <Text style={styles.modalMeta}>{selectedTicket?.price}</Text>

            {selectedTicket && (
              <View style={styles.qrContainer}>
                <Pressable
                  onPress={() => {
                    console.log("QR press detected, opening fullscreen");
                    setFullscreenQRTicket(selectedTicket);
                    setFullscreenQR(true);
                    setSelectedTicket(null);  // close parent modal
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {({ pressed }) => (
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                          selectedTicket.id
                        )}&size=300x300`,
                      }}
                      style={[styles.qrCode, { opacity: pressed ? 0.7 : 1 }]}
                    />
                  )}
                </Pressable>
                <Text style={styles.qrHint}>Tap to enlarge</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fullscreen QR code modal */}
      <Modal
        visible={fullscreenQR}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFullscreenQR(false);
          setFullscreenQRTicket(null);
        }}
      >
        <Pressable
          style={styles.fullscreenBackdrop}
          onPress={() => {
            setFullscreenQR(false);
            setFullscreenQRTicket(null);
          }}
        >
          <View style={styles.fullscreenQRContainer}>
            {fullscreenQRTicket && (
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                    fullscreenQRTicket.id
                  )}&size=500x500`,
                }}
                style={styles.fullscreenQRCode}
              />
            )}
            <Text style={styles.fullscreenHint}>Tap to close</Text>
          </View>
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
    marginBottom: 10,
  },

  ticketItem: {
    backgroundColor: colours.surface,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.32,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 10,
  },

  ticketTitle: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  ticketMeta: {
    color: colours.textMuted,
    fontSize: 14,
    marginTop: 4,
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
    fontWeight: "700",
    color: colours.textPrimary,
    flex: 1,
  },

  modalClose: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.primary,
  },

  modalMeta: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.textPrimary,
    marginTop: 6,
  },

  qrContainer: {
    alignItems: "center",
    marginTop: 20,
  },

  qrCode: {
    width: 300,
    height: 300,
    borderRadius: 14,
  },

  qrHint: {
    fontSize: 12,
    color: colours.textMuted,
    marginTop: 8,
  },

  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenQRContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenQRCode: {
    width: 500,
    height: 500,
  },

  fullscreenHint: {
    fontSize: 14,
    color: "#fff",
    marginTop: 16,
  },
});