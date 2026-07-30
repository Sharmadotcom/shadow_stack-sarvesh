import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import complaintRoutes from "./routes/complaints";
import uploadRoutes from "./routes/upload";
import analyticsRoutes from "./routes/analytics";
import categoryRoutes from "./routes/categories";
import userRoutes from "./routes/users";
import { checkAndEscalateSLABreaches } from "./services/slaEngine";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve static uploads
const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// Root route check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Periodic SLA Escalation Check every 30 seconds
setInterval(async () => {
  await checkAndEscalateSLABreaches();
}, 30 * 1000);

// Run immediate check on start
checkAndEscalateSLABreaches();

app.listen(PORT, () => {
  console.log(`🚀 Grievance Redressal Backend API running on http://localhost:${PORT}`);
});
