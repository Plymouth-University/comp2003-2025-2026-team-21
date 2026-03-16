import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import { AuthError, clearSession } from "./auth";
import { EventRecord } from "./eventsApi";

async function handleResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    let parsed: any | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore
    }

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

    if (
      response.status === 401 &&
      message.toLowerCase().includes("token")
    ) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response (possibly server bug):", text);
    throw new Error("Invalid response format from server");
  }
}

async function fetchWithAuth(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  return await handleResponse(res);
}

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

export interface TicketRecord {
  id: string; // this will actually be the event id, to keep compatibility with existing frontend
  title: string;
  description: string;
  date: string;
  location: string;
  price: string;
  organiserId: string;
  createdAt: string;
  eventImage: string | null;
  eventImageMimeType: string | null;
  organiser: {
    id: string;
    name: string;
    location?: string | null;
  };
}

export async function getMyTickets(): Promise<TicketRecord[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/tickets/mine`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.tickets as TicketRecord[];
}

export async function purchaseTicket(eventId: string): Promise<TicketRecord> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ eventId }),
  });

  return data.ticket as TicketRecord;
}

export async function cancelTicket(eventId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/tickets/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
