import React, { createContext, useContext, useState, ReactNode } from "react";

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
  addPost: (caption: string, imageUri: string) => void;
  toggleLike: (id: string) => void;
};

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      username: "kam",
      caption: "Freshers week was unreal 😂",
      liked: true,
      timestamp: Date.now() - 3600000,
    },
    {
      id: "2",
      username: "henry",
      caption: "Anyone going to the union tonight?",
      liked: false,
      timestamp: Date.now() - 7200000,
    },
    {
      id: "3",
      username: "dylan",
      caption: "COMP grind… again. send help.",
      liked: false,
      timestamp: Date.now() - 10800000,
    },
    {
      id: "4",
      username: "mia",
      caption: "Coffee + library sesh if anyone's down ☕️",
      liked: false,
      timestamp: Date.now() - 14400000,
    },
  ]);

  const addPost = (caption: string, imageUri: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      username: "You", // Replace with actual username when auth is implemented
      caption,
      imageUri,
      liked: false,
      timestamp: Date.now(),
    };

    setPosts((prev) => [newPost, ...prev]);
  };

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked: !p.liked } : p))
    );
  };

  return (
    <PostsContext.Provider value={{ posts, addPost, toggleLike }}>
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
