import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { quotationsTable } from "./quotations";

export const salesOrdersTable = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  quotationId: integer("quotation_id").references(() => quotationsTable.id),
  productType: text("product_type").notNull(),
  quantity: integer("quantity").notNull(),
  deliveryDate: text("delivery_date"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  orderStatus: text("order_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSalesOrderSchema = createInsertSchema(salesOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrder = typeof salesOrdersTable.$inferSelect;
