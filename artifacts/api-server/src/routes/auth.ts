import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, destroySession, requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Simple password check (plain text for demo; in production use bcrypt)
  if (user.passwordHash !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = createSession(user.id);
  const { passwordHash: _, ...safeUser } = user;

  res.json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
});

router.post("/auth/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) destroySession(token);
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.authUser);
});

export default router;
