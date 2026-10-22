import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
    const newPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !newPassword) {
      throw new Error("Check BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env");
    }

    if (newPassword.length < 8) {
      throw new Error("Use a password with at least 12 characters");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(`Admin account not found for ${email}`);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    console.log("Admin password reset successfully.");
  } catch (error) {
    console.error("Password reset failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();