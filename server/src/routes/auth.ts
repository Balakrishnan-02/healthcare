import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, allowRoles, type AuthRequest } from "../middleware/auth.js";

const router = Router();
const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200) });

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a valid email and password (minimum 8 characters)" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Email or password is incorrect" });
  }
  const secret = process.env.JWT_SECRET!;
  const token = jwt.sign({ sub: String(user._id), role: user.role, email: user.email }, secret, { expiresIn: "4h" });
  await AuditLog.create({ actorId: user._id, action: "login", resourceType: "session" });
  res.json({ token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
});

router.get("/me", requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));

// Demo-only account creation route. Restrict to admins; add invitation/approval workflow before production.
router.post("/staff", requireAuth, allowRoles("admin"), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2).max(120), email: z.string().email(), password: z.string().min(8).max(200), role: z.enum(["doctor", "nurse", "staff", "admin"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Check staff details. Password must be at least 8 characters." });
  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ ...parsed.data, email: parsed.data.email.toLowerCase(), passwordHash });
    await AuditLog.create({ actorId: req.user!.id, action: "staff_created", resourceType: "user", resourceId: String(user._id) });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch {
    res.status(409).json({ message: "Could not create staff account. Email may already be in use." });
  }
});


// Admin-only staff directory. Never expose password hashes.
router.get("/staff", requireAuth, allowRoles("admin"), async (_req, res) => {
  const users = await User.find().select("_id name email role active createdAt").sort({ createdAt: -1 }).lean();
  res.json({ users: users.map((u: any) => ({
    id: String(u._id), name: u.name, email: u.email, role: u.role,
    active: u.active, createdAt: u.createdAt
  })) });
});

// Admin-only account deactivation/reactivation.
router.patch("/staff/:id/status", requireAuth, allowRoles("admin"), async (req: AuthRequest, res) => {
  const schema = z.object({ active: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Provide active: true or false" });
  if (req.params.id === req.user!.id && parsed.data.active === false) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { active: parsed.data.active }, { new: true })
    .select("_id name email role active");
  if (!user) return res.status(404).json({ message: "Staff account not found" });
  await AuditLog.create({
    actorId: req.user!.id,
    action: parsed.data.active ? "staff_activated" : "staff_deactivated",
    resourceType: "user",
    resourceId: String(user._id)
  });
  res.json({ id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active });
});

export default router;
