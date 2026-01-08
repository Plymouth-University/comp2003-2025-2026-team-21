import { Platform } from "react-native";

export const getApiBase = () => {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env;

  if (Platform.OS === "web") {
    const host = window.location.host;
    const apiHost = host.replace(/-\d+\./, "-3001.");
    return `${window.location.protocol}//${apiHost}`;
  }

  return "http://localhost:3001";
};