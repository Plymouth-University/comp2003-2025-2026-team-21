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
        setLoading(false);
        return;
      }

      const dbPosts = await postsApi.getAllPosts();

      const formattedPosts: Post[] = dbPosts.map((dbPost: any) => ({
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
        likeCount: typeof dbPost.likeCount === "number" ? dbPost.likeCount : 0,
        liked: Boolean(dbPost.likedByMe),
        timestamp: new Date(dbPost.createdAt).getTime(),
      }));

      setPosts(formattedPosts);
    } catch (error: any) {
      if (error instanceof AuthError) {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userRole");
        router.replace("/");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (caption: string, imageUri: string) => {
    try {
      const dbPost: any = await postsApi.createPost(caption, imageUri);

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
        likeCount: typeof dbPost.likeCount === "number" ? dbPost.likeCount : 0,
        liked: Boolean(dbPost.likedByMe),
        timestamp: new Date(dbPost.createdAt).getTime(),
      };

      setPosts((prev) => [newPost, ...prev]);
    } catch (error: any) {
      if (error instanceof AuthError) {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userRole");
        router.replace("/");
      }
      throw error;
    }
  };

  const toggleLike = async (id: string) => {
    let optimisticLiked = false;
    let optimisticLikeCount = 0;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextLiked = !p.liked;
        const nextCount = Math.max(0, p.likeCount + (nextLiked ? 1 : -1));
        optimisticLiked = nextLiked;
        optimisticLikeCount = nextCount;
        return { ...p, liked: nextLiked, likeCount: nextCount };
      })
    );

    try {
      const result: any = await postsApi.togglePostLike(id);

      const nextLiked =
        typeof result?.likedByMe === "boolean" ? result.likedByMe : optimisticLiked;
      const nextCount =
        typeof result?.likeCount === "number" ? result.likeCount : optimisticLikeCount;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, liked: nextLiked, likeCount: nextCount } : p
        )
      );
    } catch (error: any) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const rolledBackLiked = !optimisticLiked;
          const rolledBackCount = Math.max(0, optimisticLikeCount + (rolledBackLiked ? 1 : -1));
          return { ...p, liked: rolledBackLiked, likeCount: rolledBackCount };
        })
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