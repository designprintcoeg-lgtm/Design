import { Router } from "express";
import { db, jobCostingTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function fmtCosting(c: typeof jobCostingTable.$inferSelect) {
  const parse = (v: string | null | undefined) => v ? parseFloat(v as string) : null;
  return {
    ...c,
    materialCost: parse(c.materialCost as string),
    machineCost: parse(c.machineCost as string),
    laborCost: parse(c.laborCost as string),
    outsourcingCost: parse(c.outsourcingCost as string),
    wasteCost: parse(c.wasteCost as string),
    totalEstimatedCost: parse(c.totalEstimatedCost as string),
    actualCost: parse(c.actualCost as string),
    sellingPrice: parse(c.sellingPrice as string),
    grossProfit: parse(c.grossProfit as string),
    grossMarginPercent: parse(c.grossMarginPercent as string),
  };
}

router.get("/job-orders/:id/costing", async (req, res) => {
  const [row] = await db.select().from(jobCostingTable).where(eq(jobCostingTable.jobOrderId, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtCosting(row));
});

router.put("/job-orders/:id/costing", async (req, res) => {
  const jobOrderId = parseInt(req.params.id);
  const { materialCost, machineCost, laborCost, outsourcingCost, wasteCost, totalEstimatedCost, actualCost, sellingPrice } = req.body;

  const totalEst = totalEstimatedCost ?? ((materialCost ?? 0) + (machineCost ?? 0) + (laborCost ?? 0) + (outsourcingCost ?? 0) + (wasteCost ?? 0));
  const actual = actualCost ?? totalEst;
  const selling = sellingPrice;
  const grossProfit = selling != null ? selling - actual : null;
  const grossMargin = selling != null && selling > 0 ? (grossProfit! / selling) * 100 : null;

  const vals = {
    jobOrderId,
    materialCost: materialCost != null ? String(materialCost) : undefined,
    machineCost: machineCost != null ? String(machineCost) : undefined,
    laborCost: laborCost != null ? String(laborCost) : undefined,
    outsourcingCost: outsourcingCost != null ? String(outsourcingCost) : undefined,
    wasteCost: wasteCost != null ? String(wasteCost) : undefined,
    totalEstimatedCost: String(totalEst),
    actualCost: actual != null ? String(actual) : undefined,
    sellingPrice: selling != null ? String(selling) : undefined,
    grossProfit: grossProfit != null ? String(grossProfit) : undefined,
    grossMarginPercent: grossMargin != null ? String(grossMargin) : undefined,
  };

  const [existing] = await db.select().from(jobCostingTable).where(eq(jobCostingTable.jobOrderId, jobOrderId));
  let row;
  if (existing) {
    [row] = await db.update(jobCostingTable).set(vals).where(eq(jobCostingTable.jobOrderId, jobOrderId)).returning();
  } else {
    [row] = await db.insert(jobCostingTable).values(vals).returning();
  }
  res.json(fmtCosting(row));
});

export default router;
