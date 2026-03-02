import * as SecureStore from "expo-secure-store";
import { clearCurrentUserCache } from "./postsApi";

export class AuthError extends Error {
  constructor(message?: string) {
    super(message || "Authentication error");
    this.name = "AuthError";
  }
}

/**
 * Wipe out any data we store locally for the current session.
 * This mirrors the logic that was previously duplicated in the
 * "profile settings" screens.
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync("authToken"),
    SecureStore.deleteItemAsync("userId"),
    SecureStore.deleteItemAsync("username"),
    SecureStore.deleteItemAsync("userEmail"),
    SecureStore.deleteItemAsync("userPassword"),
    SecureStore.deleteItemAsync("userRole"),
    SecureStore.deleteItemAsync("role"),
  ]);
  clearCurrentUserCache();
}
