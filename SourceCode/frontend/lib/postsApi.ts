import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";

export interface Post {
  id: string;
  caption: string;
  image: string; // base64
  imageMimeType: string;
  createdAt: string;
  authorId: string;
  User: {
    id: string;
    username: string;
    name: string | null;
  };
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
