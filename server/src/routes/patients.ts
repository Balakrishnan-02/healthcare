import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import Patient from "../models/Patient.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req: AuthRequest, res) => {
  const patients = await Patient.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ patients });
});

export default router;
