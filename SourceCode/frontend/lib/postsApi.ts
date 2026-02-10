import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";

export interface Post {
  id: string;
  caption: string;
  image: string; // base64
  imageMimeType: string;
  createdAt: string;
  studentId?: string | null;
  organisationId?: string | null;
  likes: number;
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

  console.log("Creating post with API URL:", API_URL);

  // Convert image to base64
  const imageBase64 = await imageUriToBase64(imageUri);
  const imageMimeType = getMimeType(imageUri);

  console.log("Image converted, size:", imageBase64.length, "bytes");
  console.log("Sending POST request to:", `${API_URL}/posts`);

  const response = await fetch(`${API_URL}/posts`, {
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

  console.log("Response status:", response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create post");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/posts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Get posts response status:", response.status);
  const responseText = await response.text();
  console.log("Response text (first 200 chars):", responseText.substring(0, 200));

  if (!response.ok) {
    console.error("Error fetching posts:", responseText);
    let error;
    try {
      error = JSON.parse(responseText);
    } catch {
      throw new Error(`Failed to fetch posts: ${response.status} ${responseText.substring(0, 100)}`);
    }
    throw new Error(error.message || "Failed to fetch posts");
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("Failed to parse response as JSON:", responseText);
    throw new Error("Invalid response format from server");
  }
  
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

  const response = await fetch(`${API_URL}/posts/user/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch user posts");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch post");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch user profile");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/auth/user/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || "Failed to fetch user profile");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/auth/profile-image`, {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || "Failed to update profile image");
  }

  const data = await response.json();
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

  const response = await fetch(`${API_URL}/auth/password`, {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || "Failed to update password");
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<void> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete post");
  }
}

/**
 * Update like count for a post
 */
export async function updatePostLike(postId: string, delta: number): Promise<number> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/posts/${postId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ delta }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update like count");
  }

  const data = await response.json();
  return data.post.likes;
}
