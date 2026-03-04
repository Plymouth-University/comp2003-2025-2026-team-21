import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { AuthError, clearSession } from "./auth";

async function handleResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    let parsed: any | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore
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

    if (
      response.status === 401 &&
      message.toLowerCase().includes("token")
    ) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response", text);
    throw new Error("Invalid response format from server");
  }
}

async function fetchWithAuth(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  return await handleResponse(res);
}

export interface EventRecord {
  id: string;
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

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

async function imageUriToBase64(uri: string): Promise<string> {
  let fileUri = uri;

  if (!uri.startsWith("file://") && !uri.startsWith("content://")) {
    fileUri = `file://${uri}`;
  }

  return await FileSystem.readAsStringAsync(fileUri, {
    encoding: "base64" as any,
  });
}

function getMimeType(uri: string): string {
  const extension = uri.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export async function createEvent(params: {
  title: string;
  description: string;
  date: string;
  location: string;
  price: string;
  imageUri?: string | null;
}): Promise<EventRecord> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const payload: Record<string, string> = {
    title: params.title,
    description: params.description,
    date: params.date,
    location: params.location,
    price: params.price,
  };

  if (params.imageUri) {
    payload.eventImage = await imageUriToBase64(params.imageUri);
    payload.eventImageMimeType = getMimeType(params.imageUri);
  }

  const data = await fetchWithAuth(`${API_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return data.event as EventRecord;
}

export async function getEvents(): Promise<EventRecord[]> {
  const token = await getAuthToken();

  // If there's no token we still allow the unauthenticated route.
  const init: RequestInit = { method: "GET" };
  if (token) {
    init.headers = { Authorization: `Bearer ${token}` };
  }

  // use handleResponse directly since the endpoint is public
  const data = await fetchWithAuth(`${API_URL}/events`, init);
  return data.events as EventRecord[];
}

export async function getEventsByOrganiser(
  organiserId: string
): Promise<EventRecord[]> {
  const response = await fetch(`${API_URL}/events/organiser/${organiserId}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch organiser events");
  }

  const data = await response.json();
  return data.events as EventRecord[];
}

export async function getMyEvents(): Promise<EventRecord[]> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/events/mine`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.events as EventRecord[];
}

export async function updateEvent(params: {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: string;
  imageUri?: string | null;
}): Promise<EventRecord> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const payload: Record<string, string | null> = {
    title: params.title,
    description: params.description,
    date: params.date,
    location: params.location,
    price: params.price,
  };

  if (params.imageUri) {
    payload.eventImage = await imageUriToBase64(params.imageUri);
    payload.eventImageMimeType = getMimeType(params.imageUri);
  }

  const data = await fetchWithAuth(`${API_URL}/events/${params.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return data.event as EventRecord;
}

export async function deleteEvent(id: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
