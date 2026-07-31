"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return globalSocket;
}

export function useSocket(onRealtimeEvent?: (eventData: any) => void) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      if (user) {
        socket.emit("join_room", {
          role: user.role,
          userId: user.id,
          category: user.department,
        });
      }
    }

    function onDisconnect() {
      setConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      onConnect();
    }

    // Generic real-time event listener
    const handleUpdate = (data: any) => {
      console.log("[Socket.io Realtime Event]", data);
      if (onRealtimeEvent) {
        onRealtimeEvent(data);
      }
    };

    socket.on("complaint_created", handleUpdate);
    socket.on("complaint_updated", handleUpdate);
    socket.on("realtime_update", handleUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("complaint_created", handleUpdate);
      socket.off("complaint_updated", handleUpdate);
      socket.off("realtime_update", handleUpdate);
    };
  }, [user, onRealtimeEvent]);

  return { socket: getSocket(), connected };
}
