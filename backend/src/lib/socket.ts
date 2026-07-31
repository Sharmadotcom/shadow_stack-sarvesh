import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export function initSocket(server: HTTPServer): Server {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join general room
    socket.join("global");

    // Room subscription handler
    socket.on("join_room", (data: { room?: string; role?: string; userId?: string; category?: string }) => {
      if (data.room) {
        socket.join(data.room);
        console.log(`[Socket.io] Client ${socket.id} joined room: ${data.room}`);
      }
      if (data.role) {
        socket.join(`role:${data.role}`);
      }
      if (data.userId) {
        socket.join(`user:${data.userId}`);
      }
      if (data.category) {
        socket.join(`category:${data.category.toLowerCase()}`);
      }
    });

    socket.on("leave_room", (data: { room: string }) => {
      if (data.room) {
        socket.leave(data.room);
        console.log(`[Socket.io] Client ${socket.id} left room: ${data.room}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket first.");
  }
  return io;
}

export function notifyComplaintCreated(complaint: any) {
  if (!io) return;
  const payload = {
    event: "COMPLAINT_CREATED",
    complaint,
    timestamp: new Date().toISOString(),
  };

  // Broadcast globally to all connected clients & specific rooms
  io.emit("complaint_created", payload);
  io.emit("realtime_update", payload);
}

export function notifyComplaintUpdated(complaint: any, actionType: string = "UPDATED", message?: string) {
  if (!io) return;
  const payload = {
    event: `COMPLAINT_${actionType.toUpperCase()}`,
    actionType,
    complaint,
    message,
    timestamp: new Date().toISOString(),
  };

  // Broadcast globally to all connected clients & specific rooms
  io.emit("complaint_updated", payload);
  io.emit("realtime_update", payload);
}
