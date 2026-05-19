import { Router } from "express";
import { db, quotationsTable, customersTable, salesOrdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function fmtQ(q: typeof quotationsTable.$inferSelect) {
  const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, q.customerId));
  return {
    ...q,
    unitPrice: parseFloat(q.unitPrice as string),
    totalPrice: parseFloat(q.totalPrice as string),
    customerName: cust?.name ?? null,
    createdAt: q.createdAt.toISOString(),
  };
}

function nextQuotationNumber(existing: string[]): string {
  const nums = existing.map(n => parseInt(n.replace(/\D/g, '')) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `QT-${String(max + 1).padStart(5, '0')}`;
}

router.get("/quotations", async (_req, res) => {
  const rows = await db.select().from(quotationsTable).orderBy(quotationsTable.createdAt);
  res.json(await Promise.all(rows.map(fmtQ)));
});

router.post("/quotations", async (req, res) => {
  const existing = await db.select({ quotationNumber: quotationsTable.quotationNumber }).from(quotationsTable);
  const quotationNumber = nextQuotationNumber(existing.map(e => e.quotationNumber));
  const { customerId, productType, quantity, unitPrice, paymentTerms, deliveryDate, status, notes } = req.body;
  const totalPrice = (quantity * unitPrice).toFixed(2);
  const [row] = await db.insert(quotationsTable).values({
    quotationNumber, customerId, productType, quantity, unitPrice: String(unitPrice), totalPrice, paymentTerms, deliveryDate, status: status || 'draft', notes
  }).returning();
  res.status(201).json(await fmtQ(row));
});

router.get("/quotations/:id", async (req, res) => {
  const [row] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, parseInt(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmtQ(row));
});

router.patch("/quotations/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  const { productType, quantity, unitPrice, paymentTerms, deliveryDate, status, notes } = req.body;
  if (productType !== undefined) updates.productType = productType;
  if (quantity !== undefined) updates.quantity = quantity;
  if (unitPrice !== undefined) updates.unitPrice = String(unitPrice);
  if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms;
  if (deliveryDate !== undefined) updates.deliveryDate = deliveryDate;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const [existing] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, parseInt(req.params.id)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  if (quantity !== undefined || unitPrice !== undefined) {
    const qty = quantity !== undefined ? quantity : existing.quantity;
    const price = unitPrice !== undefined ? unitPrice : parseFloat(existing.unitPrice as string);
    updates.totalPrice = String((qty * price).toFixed(2));
  }

  const [row] = await db.update(quotationsTable).set(updates).where(eq(quotationsTable.id, parseInt(req.params.id))).returning();
  res.json(await fmtQ(row));
});

router.delete("/quotations/:id", async (req, res) => {
  await db.delete(quotationsTable).where(eq(quotationsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.post("/quotations/:id/convert", async (req, res) => {
  const [q] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, parseInt(req.params.id)));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.status !== 'approved') { res.status(400).json({ error: "Only approved quotations can be converted" }); return; }

  const existing = await db.select({ orderNumber: salesOrdersTable.orderNumber }).from(salesOrdersTable);
  const nums = existing.map(e => parseInt(e.orderNumber.replace(/\D/g, '')) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  const orderNumber = `SO-${String(max + 1).padStart(5, '0')}`;

  const [order] = await db.insert(salesOrdersTable).values({
    orderNumber,
    customerId: q.customerId,
    quotationId: q.id,
    productType: q.productType,
    quantity: q.quantity,
    deliveryDate: q.deliveryDate,
    paymentStatus: 'unpaid',
    orderStatus: 'pending',
  }).returning();

  const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, order.customerId));
  res.status(201).json({
    ...order,
    customerName: cust?.name ?? null,
    quotationNumber: q.quotationNumber,
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;
