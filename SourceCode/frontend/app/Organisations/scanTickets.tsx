import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colours } from "../../lib/theme/colours";
import { Ionicons } from "@expo/vector-icons";
import { validateTicket, ValidatedTicket } from "../../lib/ticketsApi";

type ScanResult = {
  success: boolean;
  message: string;
  ticket?: ValidatedTicket;
};

export default function ScanTickets() {
  const insets = useSafeAreaInsets();
  const { eventId, eventTitle } = useLocalSearchParams<{
    eventId?: string;
    eventTitle?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ValidatedTicket[]>([]);

  const isProcessing = useRef(false);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const response = await validateTicket(data, eventId);
      const ticket = response.ticket;

      if (response.success) {
        setResult({
          success: true,
          message: "Ticket validated!",
          ticket,
        });
        setRecentScans((prev) => [ticket, ...prev].slice(0, 10));
      }
    } catch (err: any) {
      const msg = err.message || "Validation failed";
      setResult({
        success: false,
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setResult(null);
    isProcessing.current = false;
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colours.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color={colours.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan tickets, allow camera access in settings.
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Tickets</Text>
        {eventTitle ? (
          <Text style={styles.headerEventName}>
            Scanning for: {decodeURIComponent(eventTitle)}
          </Text>
        ) : null}
        <Text style={styles.headerSubtitle}>
          Point camera at student's QR code
        </Text>
      </View>

      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleScan}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
        </CameraView>
      </View>

      {recentScans.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Recent Scans</Text>
          {recentScans.map((ticket) => (
            <View key={ticket.id} style={styles.recentItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colours.success}
              />
              <Text style={styles.recentText}>
                {ticket.student.name || ticket.student.email} -{" "}
                {ticket.event.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={!!result}
        transparent
        animationType="fade"
        onRequestClose={resetScan}
      >
        <Pressable style={styles.modalBackdrop} onPress={resetScan}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {loading ? (
              <ActivityIndicator size="large" color={colours.primary} />
            ) : result?.success ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={colours.success}
                />
                <Text style={styles.modalTitle}>Valid Ticket</Text>
                <Text style={styles.modalStudent}>
                  {result.ticket?.student.name || result.ticket?.student.email}
                </Text>
                <Text style={styles.modalEvent}>
                  {result.ticket?.event.title}
                </Text>
                <Text style={styles.modalMeta}>
                  {result.ticket?.event.location}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={64} color={colours.error} />
                <Text style={styles.modalTitleError}>Invalid Ticket</Text>
                <Text style={styles.modalError}>{result?.message}</Text>
              </>
            )}
            <Pressable style={styles.modalButton} onPress={resetScan}>
              <Text style={styles.modalButtonText}>Scan Another</Text>
            </Pressable>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colours.textPrimary,
  },
  headerEventName: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.primary,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colours.textMuted,
    marginTop: 4,
  },
  scannerContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colours.surface,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colours.primary,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  recentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colours.textSecondary,
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  recentText: {
    fontSize: 14,
    color: colours.textPrimary,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colours.textPrimary,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: colours.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: colours.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colours.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colours.success,
    marginTop: 16,
  },
  modalTitleError: {
    fontSize: 22,
    fontWeight: "700",
    color: colours.error,
    marginTop: 16,
  },
  modalStudent: {
    fontSize: 18,
    fontWeight: "600",
    color: colours.textPrimary,
    marginTop: 8,
  },
  modalEvent: {
    fontSize: 16,
    color: colours.textSecondary,
    marginTop: 4,
  },
  modalMeta: {
    fontSize: 14,
    color: colours.textMuted,
    marginTop: 2,
  },
  modalError: {
    fontSize: 14,
    color: colours.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: colours.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  modalButtonText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
