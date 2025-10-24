import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import driveRoutes from "./routes/drive.js";
import ingestRoutes from "./routes/ingest.js";
import chatRoutes from "./routes/chat.js";
import explorerRoutes from "./routes/explorer.js";
import workflowRoutes from "./routes/workflows.js";
import insightsRoutes from "./routes/insights.js";
import { initializeElasticsearch } from "./config/elasticsearch.js";
import { workflowScheduler } from "./services/workflowScheduler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
// Build an allowlist from env; support comma-separated values. Trim trailing slashes.
const RAW_FRONTEND_URLS =
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";
const ALLOWED_ORIGINS = RAW_FRONTEND_URLS.split(",").map((s) =>
  s.trim().replace(/\/+$/, "")
);

// Helper used by CORS to validate/echo the incoming origin when allowed
function corsOriginValidator(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) {
  // Allow non-browser requests with no origin
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/+$/, "");
  // allow localhost during development, or any origin in the ALLOWED_ORIGINS list
  if (
    ALLOWED_ORIGINS.includes(normalized) ||
    normalized.startsWith("http://localhost") ||
    normalized.startsWith("http://127.0.0.1")
  ) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
}

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginValidator as any,
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: corsOriginValidator as any,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Analytics Copilot API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      drive: "/api/drive",
      ingest: "/api/ingest",
      chat: "/api/chat",
      explorer: "/api/explorer",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/explorer", explorerRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/insights", insightsRoutes);

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Chat events (to be implemented)
  socket.on("chat:message", async (data) => {
    console.log("Chat message received:", data);
    // TODO: Connect to LangGraph workflow
  });
});

// Make io available to routes
app.set("io", io);

// Initialize and start server
async function startServer() {
  try {
    // Initialize Elasticsearch
    console.log("🔧 Initializing Elasticsearch...");
    await initializeElasticsearch();

    // Initialize Workflow Scheduler
    console.log("🔧 Initializing workflow scheduler...");
    await workflowScheduler.initialize();

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Frontend allowlist: ${ALLOWED_ORIGINS.join(', ')}`);
      console.log(
        `⏰ Workflow scheduler: ${workflowScheduler.getScheduledCount()} workflows scheduled`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
