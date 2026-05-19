import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const machinesTable = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  productionLine: text("production_line").notNull(),
  status: text("status").notNull().default("available"),
  currentJobId: integer("current_job_id"),
  operatorId: integer("operator_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMachineSchema = createInsertSchema(machinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machinesTable.$inferSelect;
