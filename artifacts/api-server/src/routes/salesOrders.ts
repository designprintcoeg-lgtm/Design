import { Router } from "express";
import { db, salesOrdersTable, customersTable, quotationsTable, jobOrdersTable, jobStagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

async function fmtOrder(o: typeof salesOrdersTable.$inferSelect) {
  const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, o.customerId));
  let quotationNumber: string | null = null;
  if (o.quotationId) {
    const [q] = await db.select({ quotationNumber: quotationsTable.quotationNumber }).from(quotationsTable).where(eq(quotationsTable.id, o.quotationId));
    quotationNumber = q?.quotationNumber ?? null;
  }
  return { ...o, customerName: cust?.name ?? null, quotationNumber, createdAt: o.createdAt.toISOString() };
}

router.get("/sales-orders", async (_req, res) => {
  const rows = await db.select().from(salesOrdersTable).orderBy(salesOrdersTable.createdAt);
  res.json(await Promise.all(rows.map(fmtOrder)));
});

router.post("/sales-orders", async (req, res) => {
  const existing = await db.select({ orderNumber: salesOrdersTable.orderNumber }).from(salesOrdersTable);
  const nums = existing.map(e => parseInt(e.orderNumber.replace(/\D/g, '')) || 0);
  const orderNumber = `SO-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(5, '0')}`;
  const { customerId, quotationId, productType, quantity, deliveryDate, paymentStatus, orderStatus, notes } = req.body;
  const [row] = await db.insert(salesOrdersTable).values({ orderNumber, customerId, quotationId, productType, quantity, deliveryDate, paymentStatus: paymentStatus || 'unpaid', orderStatus: orderStatus || 'pending', notes }).returning();
  res.status(201).json(await fmtOrder(row));
});

router.get("/sales-orders/:id", async (req, res) => {
  const [row] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtOrder(row));
});

router.patch("/sales-orders/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  for (const k of ['productType', 'quantity', 'deliveryDate', 'paymentStatus', 'orderStatus', 'notes']) {
    if (req.body[k] !== undefined) updates[k === 'productType' ? 'productType' : k] = req.body[k];
  }
  const [row] = await db.update(salesOrdersTable).set(updates).where(eq(salesOrdersTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtOrder(row));
});

router.post("/sales-orders/:id/generate-job", async (req, res) => {
  const [order] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, parseInt(req.params.id)));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  const existing = await db.select({ jobNumber: jobOrdersTable.jobNumber }).from(jobOrdersTable);
  const nums = existing.map(e => parseInt(e.jobNumber.replace(/\D/g, '')) || 0);
  const jobNumber = `JO-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(5, '0')}`;

  const productionLine = 'offset_printing';
  const [job] = await db.insert(jobOrdersTable).values({
    jobNumber,
    customerId: order.customerId,
    salesOrderId: order.id,
    productType: order.productType,
    productionLine,
    quantity: order.quantity,
    designFileStatus: 'pending',
    requiredDeliveryDate: order.deliveryDate,
    priority: 'normal',
    currentStage: WORKFLOWS[productionLine][0],
    status: 'pending',
    isDelayed: false,
  }).returning();

  const stages = WORKFLOWS[productionLine];
  for (let i = 0; i < stages.length; i++) {
    await db.insert(jobStagesTable).values({ jobOrderId: job.id, stageName: stages[i], stageOrder: i + 1, status: i === 0 ? 'waiting' : 'waiting' });
  }

  await db.update(salesOrdersTable).set({ orderStatus: 'in_production' }).where(eq(salesOrdersTable.id, order.id));

  const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, job.customerId));
  res.status(201).json({ ...job, customerName: cust?.name ?? null, createdAt: job.createdAt.toISOString() });
});

export default router;
