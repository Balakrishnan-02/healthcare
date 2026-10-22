import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

let connectionPromise: Promise<typeof mongoose> | null = null;
let bootstrapAttempted = false;

export async function connectDB() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Missing configuration: MONGODB_URI and a JWT_SECRET of at least 32 characters must be set in environment variables.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  await connectionPromise;

  if (!bootstrapAttempted && process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    bootstrapAttempted = true;
    try {
      const email = process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const exists = await User.findOne({ email });
      if (!exists) {
        const passwordHash = await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 12);
        await User.create({ name: "Clinic Administrator", email, passwordHash, role: "admin" });
        console.log("Bootstrap admin created. Change its password immediately.");
      }
    } catch (err) {
      console.error("Bootstrap admin creation error:", err);
    }
  }

  return mongoose;
}
