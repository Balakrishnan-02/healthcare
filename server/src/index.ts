import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import syncRoutes from "./routes/sync.js";
import User from "./models/User.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? "http://localhost:5173" }));
app.use(express.json({ limit: "200kb" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/sync", syncRoutes);
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error");
  res.status(500).json({ message: "Unexpected server error" });
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set MONGODB_URI and a JWT_SECRET of at least 32 characters in server/.env");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  if (process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const exists = await User.findOne({ email });
    if (!exists) {
      const passwordHash = await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 12);
      await User.create({ name: "Clinic Administrator", email, passwordHash, role: "admin" });
      console.log("Bootstrap admin created. Change its password immediately.");
    }
  }
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`RuralCare API listening on http://localhost:${port}`));
}
start().catch((err) => { console.error("Startup failed:", err instanceof Error ? err.message : "unknown error"); process.exit(1); });
