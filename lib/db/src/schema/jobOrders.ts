import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { salesOrdersTable } from "./salesOrders";

export const jobOrdersTable = pgTable("job_orders", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  salesOrderId: integer("sales_order_id").references(() => salesOrdersTable.id),
  productType: text("product_type").notNull(),
  productionLine: text("production_line").notNull(),
  quantity: integer("quantity").notNull(),
  designFileStatus: text("design_file_status").notNull().default("pending"),
  requiredDeliveryDate: text("required_delivery_date"),
  priority: text("priority").notNull().default("normal"),
  currentStage: text("current_stage"),
  assignedDepartment: text("assigned_department"),
  assignedUserId: integer("assigned_user_id"),
  status: text("status").notNull().default("pending"),
  isDelayed: boolean("is_delayed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobOrderSchema = createInsertSchema(jobOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobOrder = z.infer<typeof insertJobOrderSchema>;
export type JobOrder = typeof jobOrdersTable.$inferSelect;
