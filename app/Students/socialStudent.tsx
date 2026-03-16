import React, { useCallback } from "react";
import SocialFeed from "../components/socialFeed";
import { usePosts } from "../../contexts/PostsContext";
import { useTabRefresh } from "../hooks/useTabRefresh";

export default function SocialStudent() {
  const { refreshPosts } = usePosts();

  const refresh = useCallback(() => {
    refreshPosts();
  }, [refreshPosts]);

  useTabRefresh(refresh);

  return <SocialFeed refreshTrigger={refreshPosts.toString()} />;
}