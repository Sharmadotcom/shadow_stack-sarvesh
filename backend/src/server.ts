import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import complaintRoutes from "./routes/complaints";
import uploadRoutes from "./routes/upload";
import analyticsRoutes from "./routes/analytics";
import categoryRoutes from "./routes/categories";
import userRoutes from "./routes/users";
import { checkAndEscalateSLABreaches } from "./services/slaEngine";
import { initSocket } from "./lib/socket";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io server for real-time WebSocket communication
initSocket(server);

// Ensure uploads directory exists on startup
const uploadsPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve static uploads
app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// Root route health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Periodic SLA Escalation Check every 30 seconds
setInterval(async () => {
  await checkAndEscalateSLABreaches();
}, 30 * 1000);

// Run immediate check on start
checkAndEscalateSLABreaches();

server.listen(PORT, () => {
  console.log(`Grievance Redressal Backend API with Socket.io running on http://localhost:${PORT}`);
});
