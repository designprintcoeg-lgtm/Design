import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const materialsTable = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  currentQuantity: numeric("current_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  minimumQuantity: numeric("minimum_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  supplier: text("supplier"),
  costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materialsTable.$inferSelect;
