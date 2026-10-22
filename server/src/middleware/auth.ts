import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Sign in required" });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "Server auth is not configured" });
    const payload = jwt.verify(header.slice(7), secret) as { sub: string; role: string; email: string };
    const user = await User.findById(payload.sub).select("_id role email active");
    if (!user || !user.active) return res.status(401).json({ message: "Account inactive or unavailable" });
    req.user = { id: String(user._id), role: user.role, email: user.email };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

export function allowRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action" });
    next();
  };
}
