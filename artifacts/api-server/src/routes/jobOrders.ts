import { Router } from "express";
import { db, jobOrdersTable, jobStagesTable, customersTable, usersTable, machinesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const WORKFLOWS: Record<string, string[]> = {
  offset_printing: ["Design", "Finalizer", "CTP", "Printing", "Drying", "Cutting", "Folding", "Gluing", "QC", "Packing", "Delivery"],
  silk_screen: ["Design", "Film", "Screen Exposure", "Ink Mixing", "Printing", "Drying/UV", "QC", "Packing", "Delivery"],
  plastic_bags: ["Design", "Cylinder", "Extrusion", "Printing", "Cutting", "Sealing", "QC", "Packing", "Delivery"],
  corrugated_carton: ["Structure Design", "Offset Printing", "Lamination", "Die Cutting", "Gluing", "QC", "Packing", "Delivery"],
  flowpack: ["Design", "Cylinder", "Printing", "Lamination", "Slitting", "QC", "Packing", "Delivery"],
};

async function fmtJob(j: typeof jobOrdersTable.$inferSelect) {
  const [cust] = j.customerId ? await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, j.customerId)) : [null];
  let assignedUserName: string | null = null;
  if (j.assignedUserId) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, j.assignedUserId));
    assignedUserName = u?.name ?? null;
  }
  return {
    ...j,
    customerName: cust?.name ?? null,
    assignedUserName,
    createdAt: j.createdAt.toISOString(),
  };
}

router.get("/job-orders", async (req, res) => {
  let rows = await db.select().from(jobOrdersTable).orderBy(jobOrdersTable.createdAt);
  const now = new Date();

  // Update delayed status
  for (const r of rows) {
    if (r.requiredDeliveryDate && new Date(r.requiredDeliveryDate) < now && r.status !== 'completed' && r.status !== 'delivered' && r.status !== 'cancelled') {
      if (!r.isDelayed) {
        await db.update(jobOrdersTable).set({ isDelayed: true }).where(eq(jobOrdersTable.id, r.id));
        r.isDelayed = true;
      }
    }
  }

  if (req.query.status) rows = rows.filter(r => r.status === req.query.status);
  if (req.query.productionLine) rows = rows.filter(r => r.productionLine === req.query.productionLine);
  if (req.query.priority) rows = rows.filter(r => r.priority === req.query.priority);

  res.json(await Promise.all(rows.map(fmtJob)));
});

router.post("/job-orders", async (req, res) => {
  const existing = await db.select({ jobNumber: jobOrdersTable.jobNumber }).from(jobOrdersTable);
  const nums = existing.map(e => parseInt(e.jobNumber.replace(/\D/g, '')) || 0);
  const jobNumber = `JO-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(5, '0')}`;

  const { customerId, salesOrderId, productType, productionLine, quantity, designFileStatus, requiredDeliveryDate, priority, assignedDepartment, assignedUserId, notes } = req.body;

  const [job] = await db.insert(jobOrdersTable).values({
    jobNumber, customerId, salesOrderId, productType, productionLine, quantity,
    designFileStatus: designFileStatus || 'pending',
    requiredDeliveryDate, priority: priority || 'normal',
    currentStage: WORKFLOWS[productionLine]?.[0] || null,
    assignedDepartment, assignedUserId, status: 'pending', isDelayed: false, notes,
  }).returning();

  const stages = WORKFLOWS[productionLine] || [];
  for (let i = 0; i < stages.length; i++) {
    await db.insert(jobStagesTable).values({ jobOrderId: job.id, stageName: stages[i], stageOrder: i + 1, status: 'waiting' });
  }

  res.status(201).json(await fmtJob(job));
});

router.get("/job-orders/:id", async (req, res) => {
  const [job] = await db.select().from(jobOrdersTable).where(eq(jobOrdersTable.id, parseInt(req.params.id)));
  if (!job) { res.status(404).json({ error: "Not found" }); return; }

  const stages = await db.select().from(jobStagesTable).where(eq(jobStagesTable.jobOrderId, job.id)).orderBy(jobStagesTable.stageOrder);

  const fmtStage = async (s: typeof jobStagesTable.$inferSelect) => {
    let responsibleUserName: string | null = null;
    let machineName: string | null = null;
    if (s.responsibleUserId) {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.responsibleUserId));
      responsibleUserName = u?.name ?? null;
    }
    if (s.machineId) {
      const [m] = await db.select({ name: machinesTable.name }).from(machinesTable).where(eq(machinesTable.id, s.machineId));
      machineName = m?.name ?? null;
    }
    return {
      ...s,
      wasteQuantity: s.wasteQuantity ? parseFloat(s.wasteQuantity as string) : null,
      actualOutput: s.actualOutput ? parseFloat(s.actualOutput as string) : null,
      responsibleUserName,
      machineName,
      startTime: s.startTime?.toISOString() ?? null,
      endTime: s.endTime?.toISOString() ?? null,
    };
  };

  const fmtJob2 = await fmtJob(job);
  res.json({ ...fmtJob2, stages: await Promise.all(stages.map(fmtStage)) });
});

router.patch("/job-orders/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  for (const k of ['productType', 'quantity', 'designFileStatus', 'requiredDeliveryDate', 'priority', 'currentStage', 'assignedDepartment', 'assignedUserId', 'status', 'notes']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [job] = await db.update(jobOrdersTable).set(updates).where(eq(jobOrdersTable.id, parseInt(req.params.id))).returning();
  if (!job) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtJob(job));
});

router.post("/job-orders/:id/advance-stage", async (req, res) => {
  const jobId = parseInt(req.params.id);
  const [job] = await db.select().from(jobOrdersTable).where(eq(jobOrdersTable.id, jobId));
  if (!job) { res.status(404).json({ error: "Not found" }); return; }

  const stages = await db.select().from(jobStagesTable).where(eq(jobStagesTable.jobOrderId, jobId)).orderBy(jobStagesTable.stageOrder);
  const currentIdx = stages.findIndex(s => s.stageName === job.currentStage);

  if (currentIdx >= 0) {
    await db.update(jobStagesTable).set({ status: 'done', endTime: new Date() }).where(eq(jobStagesTable.id, stages[currentIdx].id));
  }

  const nextStage = stages[currentIdx + 1];
  if (nextStage) {
    await db.update(jobStagesTable).set({ status: 'in_progress', startTime: new Date() }).where(eq(jobStagesTable.id, nextStage.id));
    const [updated] = await db.update(jobOrdersTable).set({ currentStage: nextStage.stageName, status: 'in_progress' }).where(eq(jobOrdersTable.id, jobId)).returning();
    res.json(await fmtJob(updated));
  } else {
    const [updated] = await db.update(jobOrdersTable).set({ status: 'completed' }).where(eq(jobOrdersTable.id, jobId)).returning();
    res.json(await fmtJob(updated));
  }
});

export default router;
