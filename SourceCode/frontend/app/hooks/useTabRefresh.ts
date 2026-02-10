import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";

export function useTabRefresh(onRefresh: () => void) {
  const { _r } = useLocalSearchParams<{ _r?: string }>();

  useEffect(() => {
    if (_r) onRefresh();
  }, [_r, onRefresh]);
}