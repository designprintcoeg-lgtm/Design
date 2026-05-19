import { Router } from "express";
import { db, materialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function fmtMaterial(m: typeof materialsTable.$inferSelect) {
  const current = parseFloat(m.currentQuantity as string);
  const minimum = parseFloat(m.minimumQuantity as string);
  return {
    ...m,
    currentQuantity: current,
    minimumQuantity: minimum,
    costPerUnit: m.costPerUnit ? parseFloat(m.costPerUnit as string) : null,
    isLowStock: current <= minimum,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/materials", async (_req, res) => {
  const rows = await db.select().from(materialsTable).orderBy(materialsTable.name);
  res.json(rows.map(fmtMaterial));
});

router.post("/materials", async (req, res) => {
  const { name, category, unit, currentQuantity, minimumQuantity, supplier, costPerUnit } = req.body;
  const [row] = await db.insert(materialsTable).values({
    name, category, unit,
    currentQuantity: String(currentQuantity),
    minimumQuantity: String(minimumQuantity),
    supplier,
    costPerUnit: costPerUnit ? String(costPerUnit) : undefined,
  }).returning();
  res.status(201).json(fmtMaterial(row));
});

router.get("/materials/:id", async (req, res) => {
  const [row] = await db.select().from(materialsTable).where(eq(materialsTable.id, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtMaterial(row));
});

router.patch("/materials/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  const { name, category, unit, currentQuantity, minimumQuantity, supplier, costPerUnit } = req.body;
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (unit !== undefined) updates.unit = unit;
  if (currentQuantity !== undefined) updates.currentQuantity = String(currentQuantity);
  if (minimumQuantity !== undefined) updates.minimumQuantity = String(minimumQuantity);
  if (supplier !== undefined) updates.supplier = supplier;
  if (costPerUnit !== undefined) updates.costPerUnit = String(costPerUnit);

  const [row] = await db.update(materialsTable).set(updates).where(eq(materialsTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtMaterial(row));
});

router.delete("/materials/:id", async (req, res) => {
  await db.delete(materialsTable).where(eq(materialsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
