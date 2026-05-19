import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobOrdersTable } from "./jobOrders";

export const jobCostingTable = pgTable("job_costing", {
  id: serial("id").primaryKey(),
  jobOrderId: integer("job_order_id").notNull().unique().references(() => jobOrdersTable.id),
  materialCost: numeric("material_cost", { precision: 12, scale: 2 }),
  machineCost: numeric("machine_cost", { precision: 12, scale: 2 }),
  laborCost: numeric("labor_cost", { precision: 12, scale: 2 }),
  outsourcingCost: numeric("outsourcing_cost", { precision: 12, scale: 2 }),
  wasteCost: numeric("waste_cost", { precision: 12, scale: 2 }),
  totalEstimatedCost: numeric("total_estimated_cost", { precision: 12, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  grossProfit: numeric("gross_profit", { precision: 12, scale: 2 }),
  grossMarginPercent: numeric("gross_margin_percent", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobCostingSchema = createInsertSchema(jobCostingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobCosting = z.infer<typeof insertJobCostingSchema>;
export type JobCosting = typeof jobCostingTable.$inferSelect;
