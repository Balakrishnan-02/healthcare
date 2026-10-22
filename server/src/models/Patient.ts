import mongoose, { Schema } from "mongoose";

const PatientSchema = new Schema({
  localId: { type: String, required: true },
  facilityId: { type: String, default: "default-facility", index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  age: { type: Number, min: 0, max: 125 },
  sex: { type: String, enum: ["Female", "Male", "Other", "Prefer not to say"], default: "Prefer not to say" },
  village: { type: String, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30 },
  note: { type: String, trim: true, maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAtClient: { type: Date },
  syncKey: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model("Patient", PatientSchema);
