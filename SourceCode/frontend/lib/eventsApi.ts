import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";

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
    username: string;
    name: string | null;
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

  const response = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create event");
  }

  const data = await response.json();
  return data.event as EventRecord;
}

export async function getEvents(): Promise<EventRecord[]> {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/events`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch events");
  }

  const data = await response.json();
  return data.events as EventRecord[];
}
