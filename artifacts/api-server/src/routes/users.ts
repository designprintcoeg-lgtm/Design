import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(users.map(u => {
    const { passwordHash: _, ...safe } = u;
    return { ...safe, createdAt: safe.createdAt.toISOString() };
  }));
});

router.post("/users", async (req, res) => {
  if (req.authUser?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { username, password, name, email, role } = req.body;
  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash: password,
    name,
    email,
    role: role || "sales",
  }).returning();
  const { passwordHash: _, ...safe } = user;
  res.status(201).json({ ...safe, createdAt: safe.createdAt.toISOString() });
});

router.get("/users/:id", async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, createdAt: safe.createdAt.toISOString() });
});

router.patch("/users/:id", async (req, res) => {
  if (req.authUser?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, email, role, isActive, password } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password !== undefined) updates.passwordHash = password;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, parseInt(req.params.id))).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, createdAt: safe.createdAt.toISOString() });
});

router.delete("/users/:id", async (req, res) => {
  if (req.authUser?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
