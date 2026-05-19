import { Router } from "express";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const fmt = (c: typeof customersTable.$inferSelect) => ({ ...c, createdAt: c.createdAt.toISOString() });

router.get("/customers", async (_req, res) => {
  const rows = await db.select().from(customersTable).orderBy(customersTable.name);
  res.json(rows.map(fmt));
});

router.post("/customers", async (req, res) => {
  const { name, companyName, phone, whatsapp, email, address, customerType, source, notes } = req.body;
  const [row] = await db.insert(customersTable).values({ name, companyName, phone, whatsapp, email, address, customerType, source, notes }).returning();
  res.status(201).json(fmt(row));
});

router.get("/customers/:id", async (req, res) => {
  const [row] = await db.select().from(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

router.patch("/customers/:id", async (req, res) => {
  const { name, companyName, phone, whatsapp, email, address, customerType, source, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (companyName !== undefined) updates.companyName = companyName;
  if (phone !== undefined) updates.phone = phone;
  if (whatsapp !== undefined) updates.whatsapp = whatsapp;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (customerType !== undefined) updates.customerType = customerType;
  if (source !== undefined) updates.source = source;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(customersTable).set(updates).where(eq(customersTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

router.delete("/customers/:id", async (req, res) => {
  await db.delete(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
