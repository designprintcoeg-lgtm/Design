import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobOrdersTable } from "./jobOrders";

export const jobStagesTable = pgTable("job_stages", {
  id: serial("id").primaryKey(),
  jobOrderId: integer("job_order_id").notNull().references(() => jobOrdersTable.id),
  stageName: text("stage_name").notNull(),
  stageOrder: integer("stage_order").notNull(),
  status: text("status").notNull().default("waiting"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  responsibleUserId: integer("responsible_user_id"),
  machineId: integer("machine_id"),
  delayReason: text("delay_reason"),
  wasteQuantity: numeric("waste_quantity", { precision: 12, scale: 3 }),
  actualOutput: numeric("actual_output", { precision: 12, scale: 3 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobStageSchema = createInsertSchema(jobStagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobStage = z.infer<typeof insertJobStageSchema>;
export type JobStage = typeof jobStagesTable.$inferSelect;
