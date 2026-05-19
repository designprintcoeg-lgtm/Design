import { Router } from "express";
import { db, jobOrdersTable, jobStagesTable, qcChecklistsTable, jobCostingTable, machinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { materialsTable } from "@workspace/db";

const router = Router();
router.use(requireAuth);

router.get("/reports/production-performance", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const total = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed' || j.status === 'delivered').length;
  const delayed = jobs.filter(j => j.isDelayed).length;
  const onTimeRate = total > 0 ? ((completed - delayed) / total) * 100 : 0;

  const grouped: Record<string, number> = {};
  const labels: Record<string, string> = {
    offset_printing: 'Offset Printing',
    silk_screen: 'Silk Screen',
    plastic_bags: 'Plastic Bags',
    corrugated_carton: 'Corrugated Carton',
    flowpack: 'Flowpack',
  };
  for (const j of jobs) {
    grouped[j.productionLine] = (grouped[j.productionLine] || 0) + 1;
  }

  res.json({
    totalJobs: total,
    completedJobs: completed,
    delayedJobs: delayed,
    onTimeRate: Math.max(0, onTimeRate),
    byLine: Object.entries(grouped).map(([k, v]) => ({ name: labels[k] || k, count: v })),
  });
});

router.get("/reports/waste", async (_req, res) => {
  const stages = await db.select().from(jobStagesTable);
  const jobs = await db.select().from(jobOrdersTable);
  const jobMap = new Map(jobs.map(j => [j.id, j]));

  const result = stages
    .filter(s => s.wasteQuantity && parseFloat(s.wasteQuantity as string) > 0)
    .map(s => {
      const job = jobMap.get(s.jobOrderId);
      return {
        jobNumber: job?.jobNumber ?? 'Unknown',
        stageName: s.stageName,
        wasteQuantity: parseFloat(s.wasteQuantity as string),
        productionLine: job?.productionLine ?? 'Unknown',
      };
    });
  res.json(result);
});

router.get("/reports/qc-rejection", async (_req, res) => {
  const checklists = await db.select().from(qcChecklistsTable);
  const jobs = await db.select().from(jobOrdersTable);
  const jobMap = new Map(jobs.map(j => [j.id, j]));

  const result = checklists
    .filter(c => c.result === 'rejected' || c.result === 'rework')
    .map(c => {
      const job = jobMap.get(c.jobOrderId);
      return {
        jobNumber: job?.jobNumber ?? 'Unknown',
        result: c.result,
        productionLine: job?.productionLine ?? 'Unknown',
        notes: c.notes,
      };
    });
  res.json(result);
});

router.get("/reports/job-profitability", async (_req, res) => {
  const costings = await db.select().from(jobCostingTable);
  const jobs = await db.select().from(jobOrdersTable);
  const jobMap = new Map(jobs.map(j => [j.id, j]));

  const result = costings
    .filter(c => c.sellingPrice && c.actualCost)
    .map(c => {
      const job = jobMap.get(c.jobOrderId);
      const selling = parseFloat(c.sellingPrice as string);
      const actual = parseFloat(c.actualCost as string);
      const profit = selling - actual;
      const margin = selling > 0 ? (profit / selling) * 100 : 0;
      return {
        jobNumber: job?.jobNumber ?? 'Unknown',
        productType: job?.productType ?? 'Unknown',
        sellingPrice: selling,
        actualCost: actual,
        grossProfit: profit,
        grossMarginPercent: margin,
      };
    });
  res.json(result);
});

router.get("/reports/machine-utilization", async (_req, res) => {
  const machines = await db.select().from(machinesTable);
  const stages = await db.select().from(jobStagesTable);

  const result = machines.map(m => {
    const jobsCompleted = stages.filter(s => s.machineId === m.id && s.status === 'done').length;
    return {
      machineName: m.name,
      productionLine: m.productionLine,
      status: m.status,
      jobsCompleted,
    };
  });
  res.json(result);
});

router.get("/reports/low-stock", async (_req, res) => {
  const materials = await db.select().from(materialsTable);
  const lowStock = materials.filter(m => parseFloat(m.currentQuantity as string) <= parseFloat(m.minimumQuantity as string));
  res.json(lowStock.map(m => ({
    ...m,
    currentQuantity: parseFloat(m.currentQuantity as string),
    minimumQuantity: parseFloat(m.minimumQuantity as string),
    costPerUnit: m.costPerUnit ? parseFloat(m.costPerUnit as string) : null,
    isLowStock: true,
    createdAt: m.createdAt.toISOString(),
  })));
});

export default router;
