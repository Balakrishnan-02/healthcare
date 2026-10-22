import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import Patient from "../models/Patient.js";
import AuditLog from "../models/AuditLog.js";

const router = Router();
router.use(requireAuth);

const recordSchema = z.object({
  localId: z.string().min(1).max(100),
  fullName: z.string().trim().min(2).max(120),
  age: z.number().int().min(0).max(125).optional(),
  sex: z.enum(["Female", "Male", "Other", "Prefer not to say"]),
  village: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  note: z.string().max(2000).optional(),
  createdAtClient: z.string().optional(),
  syncKey: z.string().min(12).max(100)
});

router.post("/", async (req: AuthRequest, res) => {
  const batchSchema = z.object({ records: z.array(recordSchema).max(50) });
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "One or more queued records are invalid" });

  const results: Array<{ syncKey: string; status: "synced" | "failed"; message?: string }> = [];
  for (const record of parsed.data.records) {
    try {
      const existing = await Patient.findOne({ syncKey: record.syncKey }).select("_id").lean();
      if (!existing) {
        await Patient.create({
          ...record,
          createdBy: req.user!.id,
          createdAtClient: record.createdAtClient ? new Date(record.createdAtClient) : undefined
        });
        await AuditLog.create({ actorId: req.user!.id, action: "patient_created_sync", resourceType: "patient", resourceId: record.localId });
      }
      results.push({ syncKey: record.syncKey, status: "synced" });
    } catch {
      results.push({ syncKey: record.syncKey, status: "failed", message: "Server could not save this record" });
    }
  }
  res.json({ results });
});

export default router;
