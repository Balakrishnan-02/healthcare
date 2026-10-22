import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import syncRoutes from "./routes/sync.js";
import { connectDB } from "./db.js";

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins) {
        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      } else {
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.endsWith(".vercel.app")
        ) {
          return callback(null, true);
        }
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: "200kb" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));

// Database connection middleware ensuring connection before route execution
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    console.error("Database connection error:", message);
    res.status(503).json({
      message: "Database connection unavailable. Ensure MONGODB_URI is configured and network access (0.0.0.0/0) is enabled.",
      error: message
    });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/sync", syncRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({ message: "Unexpected server error" });
});

export { app };
export default app;
