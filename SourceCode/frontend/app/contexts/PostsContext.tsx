import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as postsApi from "../../lib/postsApi";

export type Post = {
  id: string;
  username: string;
  caption: string;
  imageUri?: string;
  liked: boolean;
  timestamp: number;
};

type PostsContextType = {
  posts: Post[];
  addPost: (caption: string, imageUri: string) => Promise<void>;
  toggleLike: (id: string) => void;
  refreshPosts: () => Promise<void>;
  loading: boolean;
};

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Load posts from database on mount
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated before trying to load posts
      const token = await SecureStore.getItemAsync("authToken");
      
      if (!token) {
        console.log("No auth token found, skipping post load");
        setLoading(false);
        return;
      }

      const dbPosts = await postsApi.getAllPosts();
      
      // Convert database posts to app format
      const formattedPosts: Post[] = dbPosts.map((dbPost) => ({
        id: dbPost.id,
        username: dbPost.User.username,
        caption: dbPost.caption,
        imageUri: `data:${dbPost.imageMimeType};base64,${dbPost.image}`,
        liked: false, // TODO: Track likes in database
        timestamp: new Date(dbPost.createdAt).getTime(),
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error("Failed to load posts:", error);
      // Keep existing posts if load fails
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (caption: string, imageUri: string) => {
    try {
      // Save to database
      const dbPost = await postsApi.createPost(caption, imageUri);

      // Add to local state
      const newPost: Post = {
        id: dbPost.id,
        username: dbPost.User.username,
        caption: dbPost.caption,
        imageUri: `data:${dbPost.imageMimeType};base64,${dbPost.image}`,
        liked: false,
        timestamp: new Date(dbPost.createdAt).getTime(),
      };

      setPosts((prev) => [newPost, ...prev]);
    } catch (error) {
      console.error("Failed to create post:", error);
      throw error;
    }
  };

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked: !p.liked } : p))
    );
  };

  const refreshPosts = async () => {
    await loadPosts();
  };

  return (
    <PostsContext.Provider value={{ posts, addPost, toggleLike, refreshPosts, loading }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error("usePosts must be used within a PostsProvider");
  }
  return context;
}
