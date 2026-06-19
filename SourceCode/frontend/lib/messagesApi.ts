import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import { AuthError, clearSession } from "./auth";

// helper used throughout this module so that every request can keep
// consistent error handling and also detect when the token has expired.
//
// behaviour when a 401 with an "expired" message comes back is to
// wipe local session data and throw an AuthError; callers can catch
// that class and redirect the user to the login screen.
async function handleResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    let parsed: any | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore parse failures; we'll craft a generic message below
    }

    // extract message, ensuring it's always a string
    let message: string;
    if (typeof parsed?.error === "string") {
      message = parsed.error;
    } else if (typeof parsed?.message === "string") {
      message = parsed.message;
    } else if (parsed?.error) {
      message = JSON.stringify(parsed.error);
    } else if (parsed?.message) {
      message = JSON.stringify(parsed.message);
    } else {
      message = `HTTP ${response.status}`;
    }

    // if we were told the token has expired, clear anything we hold
    // and convert to a specific error subclass so callers can easily
    // detect it without string matching.
    if (response.status === 401 && message.toLowerCase().includes("token")) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  // success path: attempt to parse as JSON.  some endpoints (eg. deletes)
  // sometimes return an empty body/204, which would cause JSON.parse('') to
  // throw; in that case just return null so callers can decide what to do.
  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // log the URL so we know which request misbehaved (fetchWithAuth doesn't
    // currently forward the URL, so we include a simple hint via the stack).
    console.error("Failed to parse JSON response (possibly server bug):", text);
    throw new Error("Invalid response format from server");
  }
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  return await handleResponse(res);
}

/**
 * Get auth token from SecureStore
 */
async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

// ----- Types ----------------------------------------------------------------

export interface OtherStudent {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  studentId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  reactions: MessageReaction[];
}

export interface ConversationSummary {
  id: string;
  otherStudent: OtherStudent;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

// ----- API calls ------------------------------------------------------------

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/messages/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.conversations;
}

export async function getOrCreateConversation(
  recipientId: string,
): Promise<{ conversation: { id: string }; status: number }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_URL}/messages/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipientId }),
  });
  const data = await handleResponse(res);
  return { conversation: data.conversation, status: res.status };
}

export async function fetchMessages(
  conversationId: string,
  cursor?: string,
): Promise<Message[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const params = new URLSearchParams({ limit: "30" });
  if (cursor) params.set("cursor", cursor);

  const data = await fetchWithAuth(
    `${API_URL}/messages/conversations/${conversationId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data.messages;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(
    `${API_URL}/messages/conversations/${conversationId}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function addReaction(
  messageId: string,
  emoji: string,
): Promise<MessageReaction> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(
    `${API_URL}/messages/${messageId}/reactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    },
  );
  return data.reaction;
}

export async function removeReaction(messageId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/messages/${messageId}/reactions`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
