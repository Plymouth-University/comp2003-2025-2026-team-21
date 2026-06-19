import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../lib/api";

let socketInstance: Socket | null = null;

/** Returns the shared socket singleton. */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Initialises and tears down the Socket.io connection.
 * Mount once at Students/_layout.tsx level.
 */
export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let active = true;

    async function connect() {
      const token = await SecureStore.getItemAsync("authToken");
      if (!token || !active) return;

      const socket = io(API_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket connect error:", err.message);
      });

      socketRef.current = socket;
      socketInstance = socket;
    }

    connect();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance = null;
      }
    };
  }, []);

  return socketRef.current;
}
