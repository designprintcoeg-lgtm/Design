import { Router } from "express";
import { db, jobStagesTable, usersTable, machinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function fmtStage(s: typeof jobStagesTable.$inferSelect) {
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
}

router.get("/job-orders/:id/stages", async (req, res) => {
  const stages = await db.select().from(jobStagesTable).where(eq(jobStagesTable.jobOrderId, parseInt(req.params.id))).orderBy(jobStagesTable.stageOrder);
  res.json(await Promise.all(stages.map(fmtStage)));
});

router.patch("/job-stages/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  const { status, startTime, endTime, responsibleUserId, machineId, delayReason, wasteQuantity, actualOutput, notes } = req.body;
  if (status !== undefined) updates.status = status;
  if (startTime !== undefined) updates.startTime = startTime ? new Date(startTime) : null;
  if (endTime !== undefined) updates.endTime = endTime ? new Date(endTime) : null;
  if (responsibleUserId !== undefined) updates.responsibleUserId = responsibleUserId;
  if (machineId !== undefined) updates.machineId = machineId;
  if (delayReason !== undefined) updates.delayReason = delayReason;
  if (wasteQuantity !== undefined) updates.wasteQuantity = String(wasteQuantity);
  if (actualOutput !== undefined) updates.actualOutput = String(actualOutput);
  if (notes !== undefined) updates.notes = notes;

  const [stage] = await db.update(jobStagesTable).set(updates).where(eq(jobStagesTable.id, parseInt(req.params.id))).returning();
  if (!stage) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtStage(stage));
});

export default router;
