import mongoose, { Schema } from "mongoose";
const AuditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });
export default mongoose.model("AuditLog", AuditLogSchema);
