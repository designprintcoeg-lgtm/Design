import { Router } from "express";
import { db, qcChecklistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function fmtQC(c: typeof qcChecklistsTable.$inferSelect) {
  return { ...c, inspectedAt: c.inspectedAt?.toISOString() ?? null };
}

router.get("/job-orders/:id/qc", async (req, res) => {
  const [row] = await db.select().from(qcChecklistsTable).where(eq(qcChecklistsTable.jobOrderId, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtQC(row));
});

router.put("/job-orders/:id/qc", async (req, res) => {
  const jobOrderId = parseInt(req.params.id);
  const { colorAccuracy, sizeAccuracy, materialQuality, printingDefects, finishingQuality, packingQuality, finalApproval, result, notes } = req.body;

  const vals = {
    jobOrderId,
    colorAccuracy, sizeAccuracy, materialQuality, printingDefects,
    finishingQuality, packingQuality, finalApproval,
    result: result || 'pending', notes,
    inspectedAt: new Date(),
  };

  const [existing] = await db.select().from(qcChecklistsTable).where(eq(qcChecklistsTable.jobOrderId, jobOrderId));
  let row;
  if (existing) {
    [row] = await db.update(qcChecklistsTable).set(vals).where(eq(qcChecklistsTable.jobOrderId, jobOrderId)).returning();
  } else {
    [row] = await db.insert(qcChecklistsTable).values(vals).returning();
  }
  res.json(fmtQC(row));
});

export default router;
