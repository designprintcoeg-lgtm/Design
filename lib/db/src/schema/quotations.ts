import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const quotationsTable = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  productType: text("product_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  paymentTerms: text("payment_terms"),
  deliveryDate: text("delivery_date"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;
