import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobOrdersTable } from "./jobOrders";

export const qcChecklistsTable = pgTable("qc_checklists", {
  id: serial("id").primaryKey(),
  jobOrderId: integer("job_order_id").notNull().unique().references(() => jobOrdersTable.id),
  colorAccuracy: boolean("color_accuracy"),
  sizeAccuracy: boolean("size_accuracy"),
  materialQuality: boolean("material_quality"),
  printingDefects: boolean("printing_defects"),
  finishingQuality: boolean("finishing_quality"),
  packingQuality: boolean("packing_quality"),
  finalApproval: boolean("final_approval"),
  result: text("result").notNull().default("pending"),
  notes: text("notes"),
  inspectedBy: text("inspected_by"),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQcChecklistSchema = createInsertSchema(qcChecklistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQcChecklist = z.infer<typeof insertQcChecklistSchema>;
export type QcChecklist = typeof qcChecklistsTable.$inferSelect;
