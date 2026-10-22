import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "doctor", "nurse", "staff"], default: "staff", required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
