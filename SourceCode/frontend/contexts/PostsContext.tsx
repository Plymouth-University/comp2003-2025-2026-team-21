import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as postsApi from "../lib/postsApi";
import { useRouter } from "expo-router";
import { AuthError } from "../lib/auth";

export type Post = {
  id: string;
  userId: string;
  username: string;
  userRole: "STUDENT" | "ORGANISATION";
  userAvatarUri?: string | null;
  caption: string;
  imageUri?: string;
  likeCount: number;
  liked: boolean;
  timestamp: number;
};

type PostsContextType = {
  posts: Post[];
  addPost: (caption: string, imageUri: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  refreshPosts: () => Promise<void>;
  loading: boolean;
};

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("authToken");

      if (!token) {
        console.log("No auth token found, skipping post load");
        setLoading(false);
        return;
      }

      const dbPosts = await postsApi.getAllPosts();

      const formattedPosts: Post[] = dbPosts.map((dbPost) => ({
        id: dbPost.id,
        userId: dbPost.User.id,
        username: dbPost.User.username,
        userRole: dbPost.User.role,
        userAvatarUri:
          dbPost.User.profileImage && dbPost.User.profileImageMimeType
            ? `data:${dbPost.User.profileImageMimeType};base64,${dbPost.User.profileImage}`
            : null,
        caption: dbPost.caption,
        imageUri: `data:${dbPost.imageMimeType};base64,${dbPost.image}`,
        likeCount: dbPost.likes ?? 0,
        liked: false,
        timestamp: new Date(dbPost.createdAt).getTime(),
      }));

      setPosts(formattedPosts);
    } catch (error: any) {
      console.error("Failed to load posts:", error);
      // if the token has expired, take the user back to the login screen
      if (error instanceof AuthError) {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userRole");
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (caption: string, imageUri: string) => {
    try {
      const dbPost = await postsApi.createPost(caption, imageUri);

      const newPost: Post = {
        id: dbPost.id,
        userId: dbPost.User.id,
        username: dbPost.User.username,
        userRole: dbPost.User.role,
        userAvatarUri:
          dbPost.User.profileImage && dbPost.User.profileImageMimeType
            ? `data:${dbPost.User.profileImageMimeType};base64,${dbPost.User.profileImage}`
            : null,
        caption: dbPost.caption,
        imageUri: `data:${dbPost.imageMimeType};base64,${dbPost.image}`,
        likeCount: dbPost.likes ?? 0,
        liked: false,
        timestamp: new Date(dbPost.createdAt).getTime(),
      };

      setPosts((prev) => [newPost, ...prev]);
    } catch (error: any) {
      console.error("Failed to create post:", error);
      if (error instanceof AuthError) {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userRole");
        router.replace("/");
      }
      throw error;
    }
  };

  const toggleLike = async (id: string) => {
    let delta = 0;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        delta = p.liked ? -1 : 1;
        return {
          ...p,
          liked: !p.liked,
          likeCount: Math.max(0, p.likeCount + delta),
        };
      })
    );

    try {
      const updatedLikes = await postsApi.updatePostLike(id, delta);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, likeCount: updatedLikes } : p
        )
      );
    } catch (error: any) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked: !p.liked,
                likeCount: Math.max(0, p.likeCount - delta),
              }
            : p
        )
      );
      if (error instanceof AuthError) {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userRole");
        router.replace("/");
      }
      throw error;
    }
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
