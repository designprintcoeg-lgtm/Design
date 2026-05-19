import { Router } from "express";
import { db, jobOrdersTable, customersTable, quotationsTable, salesOrdersTable, machinesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/summary", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const customers = await db.select({ id: customersTable.id }).from(customersTable);
  const quotations = await db.select({ id: quotationsTable.id }).from(quotationsTable);
  const salesOrders = await db.select().from(salesOrdersTable);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeStatuses = ['pending', 'in_progress', 'on_hold'];
  const totalActiveJobs = jobs.filter(j => activeStatuses.includes(j.status)).length;
  const delayedJobs = jobs.filter(j => j.isDelayed && j.status !== 'completed' && j.status !== 'delivered' && j.status !== 'cancelled').length;
  const completedToday = jobs.filter(j => j.status === 'completed' && j.updatedAt >= todayStart).length;
  const urgentJobs = jobs.filter(j => (j.priority === 'urgent' || j.priority === 'very_urgent') && activeStatuses.includes(j.status)).length;
  const ordersThisWeek = salesOrders.filter(o => o.deliveryDate && new Date(o.deliveryDate) >= todayStart && new Date(o.deliveryDate) <= weekEnd).length;
  const pendingOrders = salesOrders.filter(o => o.orderStatus === 'pending').length;

  res.json({
    totalActiveJobs,
    delayedJobs,
    completedToday,
    urgentJobs,
    ordersThisWeek,
    totalCustomers: customers.length,
    totalQuotations: quotations.length,
    pendingOrders,
  });
});

router.get("/dashboard/jobs-by-line", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const grouped: Record<string, number> = {};
  for (const j of jobs) {
    grouped[j.productionLine] = (grouped[j.productionLine] || 0) + 1;
  }
  const labels: Record<string, string> = {
    offset_printing: 'Offset Printing',
    silk_screen: 'Silk Screen',
    plastic_bags: 'Plastic Bags',
    corrugated_carton: 'Corrugated Carton',
    flowpack: 'Flowpack',
  };
  res.json(Object.entries(grouped).map(([k, v]) => ({ name: labels[k] || k, count: v })));
});

router.get("/dashboard/jobs-by-stage", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const grouped: Record<string, number> = {};
  for (const j of jobs) {
    if (j.currentStage) {
      grouped[j.currentStage] = (grouped[j.currentStage] || 0) + 1;
    }
  }
  res.json(Object.entries(grouped).map(([k, v]) => ({ name: k, count: v })));
});

router.get("/dashboard/urgent-jobs", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const urgent = jobs.filter(j => (j.priority === 'urgent' || j.priority === 'very_urgent') && j.status !== 'completed' && j.status !== 'delivered' && j.status !== 'cancelled');
  const result = [];
  for (const j of urgent) {
    const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, j.customerId));
    result.push({ ...j, customerName: cust?.name ?? null, createdAt: j.createdAt.toISOString() });
  }
  res.json(result);
});

router.get("/dashboard/delayed-jobs", async (_req, res) => {
  const jobs = await db.select().from(jobOrdersTable);
  const delayed = jobs.filter(j => j.isDelayed && j.status !== 'completed' && j.status !== 'delivered' && j.status !== 'cancelled');
  const result = [];
  for (const j of delayed) {
    const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, j.customerId));
    result.push({ ...j, customerName: cust?.name ?? null, createdAt: j.createdAt.toISOString() });
  }
  res.json(result);
});

router.get("/dashboard/due-today", async (_req, res) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const jobs = await db.select().from(jobOrdersTable);
  const dueToday = jobs.filter(j => j.requiredDeliveryDate === today);
  const result = [];
  for (const j of dueToday) {
    const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, j.customerId));
    result.push({ ...j, customerName: cust?.name ?? null, createdAt: j.createdAt.toISOString() });
  }
  res.json(result);
});

router.get("/dashboard/machine-load", async (_req, res) => {
  const machines = await db.select().from(machinesTable);
  const result = [];
  for (const m of machines) {
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
    result.push({ id: m.id, name: m.name, productionLine: m.productionLine, status: m.status, currentJobNumber, operatorName });
  }
  res.json(result);
});

export default router;
