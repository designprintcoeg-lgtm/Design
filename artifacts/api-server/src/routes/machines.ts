import { Router } from "express";
import { db, machinesTable, usersTable, jobOrdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function fmtMachine(m: typeof machinesTable.$inferSelect) {
  let operatorName: string | null = null;
  let currentJobNumber: string | null = null;
  if (m.operatorId) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, m.operatorId));
    operatorName = u?.name ?? null;
  }
  if (m.currentJobId) {
    const [j] = await db.select({ jobNumber: jobOrdersTable.jobNumber }).from(jobOrdersTable).where(eq(jobOrdersTable.id, m.currentJobId));
    currentJobNumber = j?.jobNumber ?? null;
  }
  return { ...m, operatorName, currentJobNumber, createdAt: m.createdAt.toISOString() };
}

router.get("/machines", async (_req, res) => {
  const rows = await db.select().from(machinesTable).orderBy(machinesTable.name);
  res.json(await Promise.all(rows.map(fmtMachine)));
});

router.post("/machines", async (req, res) => {
  const { name, productionLine, status, operatorId, notes } = req.body;
  const [row] = await db.insert(machinesTable).values({ name, productionLine, status: status || 'available', operatorId, notes }).returning();
  res.status(201).json(await fmtMachine(row));
});

router.get("/machines/:id", async (req, res) => {
  const [row] = await db.select().from(machinesTable).where(eq(machinesTable.id, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtMachine(row));
});

router.patch("/machines/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  for (const k of ['name', 'productionLine', 'status', 'currentJobId', 'operatorId', 'notes']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [row] = await db.update(machinesTable).set(updates).where(eq(machinesTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtMachine(row));
});

router.delete("/machines/:id", async (req, res) => {
  await db.delete(machinesTable).where(eq(machinesTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
