import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
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
    if (
      response.status === 401 &&
      message.toLowerCase().includes("token")
    ) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  // success path: parse as JSON, again logging if the payload is
  // malformed just to aid debugging during development.
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response", text);
    throw new Error("Invalid response format from server");
  }
}

async function fetchWithAuth(
  url: string,
  init: RequestInit
): Promise<any> {
  const res = await fetch(url, init);
  return await handleResponse(res);
}

export interface Post {
  id: string;
  caption: string;
  image: string;
  imageMimeType: string;
  createdAt: string;
  studentId?: string | null;
  organisationId?: string | null;

  likeCount: number;
  likedByMe: boolean;

  User: {
    id: string;
    username: string;
    name: string | null;
    role: "STUDENT" | "ORGANISATION";
    profileImage: string | null;
    profileImageMimeType: string | null;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  name: string | null;
  role: "STUDENT" | "ORGANISATION";
  location?: string | null;
  profileImage: string | null;
  profileImageMimeType: string | null;
}

export interface PublicUserProfile {
  id: string;
  username?: string;
  name: string | null;
  role?: "STUDENT" | "ORGANISATION";
  location?: string | null;
  profileImage: string | null;
  profileImageMimeType: string | null;
  createdAt: string;
}

let currentUserCache: UserProfile | null = null;
const publicUserCache = new Map<string, PublicUserProfile>();

export function clearCurrentUserCache(): void {
  currentUserCache = null;
  publicUserCache.clear();
}

/**
 * Get auth token from SecureStore
 */
async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

/**
 * Convert image URI to base64
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    console.log("Converting image URI to base64:", uri);
    
    // Handle different URI formats
    let fileUri = uri;
    
    // If it's a file:// URI, use it directly
    // If it's not, assume it needs the file:// prefix
    if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
      fileUri = `file://${uri}`;
    }
    
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });
    
    console.log("Successfully converted image to base64, length:", base64.length);
    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    console.error("Original URI:", uri);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get image MIME type from URI
 */
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
      return "image/jpeg"; // default fallback
  }
}

/**
 * Create a new post
 */
export async function createPost(caption: string, imageUri: string): Promise<Post> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Convert image to base64
  const imageBase64 = await imageUriToBase64(imageUri);
  const imageMimeType = getMimeType(imageUri);

  const data = await fetchWithAuth(`${API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      caption,
      image: imageBase64,
      imageMimeType,
    }),
  });

  return data.post;
}

/**
 * Get all posts
 */
export async function getAllPosts(): Promise<Post[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  console.log("Fetching posts from:", `${API_URL}/posts`);

  const data = await fetchWithAuth(`${API_URL}/posts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.posts;
}

/**
 * Get posts by user
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/posts/user/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.posts;
}

/**
 * Get a single post by id
 */
export async function getPostById(postId: string): Promise<Post> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/posts/${postId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.post;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserProfile> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  if (currentUserCache) {
    return currentUserCache;
  }

  const data = await fetchWithAuth(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  currentUserCache = data.user;
  return data.user;
}

/**
 * Get public profile for a specific user
 */
export async function getUserProfile(userId: string): Promise<PublicUserProfile> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const cachedProfile = publicUserCache.get(userId);
  if (cachedProfile) {
    return cachedProfile;
  }

  const data = await fetchWithAuth(`${API_URL}/auth/user/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  publicUserCache.set(userId, data.user);
  return data.user;
}

/**
 * Update current user's profile image
 */
export async function updateProfileImage(imageUri: string): Promise<UserProfile> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const imageBase64 = await imageUriToBase64(imageUri);
  const imageMimeType = getMimeType(imageUri);

  const data = await fetchWithAuth(`${API_URL}/auth/profile-image`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      image: imageBase64,
      imageMimeType,
    }),
  });

  currentUserCache = data.user;
  return data.user;
}

/**
 * Update current user's password
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/auth/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  });
}

/**
 * Delete current user's account
 */
export async function deleteAccount(): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/auth/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Update a post (caption and/or image)
 */
export async function updatePost(
  postId: string,
  caption?: string,
  imageUri?: string
): Promise<Post> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const body: any = {};
  if (caption) body.caption = caption;

  if (imageUri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = imageUri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      body.image = base64;
      body.imageMimeType = mimeType;
    } catch {
      throw new Error("Failed to read image file");
    }
  }

  const data = await fetchWithAuth(`${API_URL}/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return data.post;
}

/**
 * Update like count for a post
 */
export async function togglePostLike(
  postId: string
): Promise<{ likeCount: number; likedByMe: boolean }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/posts/${postId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const post = data.post ?? data;

  return {
    likeCount: post.likeCount ?? post.likes ?? 0,
    likedByMe: Boolean(post.likedByMe),
  };
}
