import { sql } from "drizzle-orm";
import { check, date, pgEnum, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const opportunityTypeEnum = pgEnum("application_opportunity_type", ["Full-time", "Part-time", "Internship", "Training", "Train-to-Hire", "Freelance"]);
export const workModeEnum = pgEnum("application_work_mode", ["On-site", "Remote", "Hybrid"]);
export const applicationStatusEnum = pgEnum("application_status", ["Saved", "Applied", "Under Review", "Assessment", "Interview", "Technical Interview", "Final Interview", "Offer", "Accepted", "Rejected", "Withdrawn"]);
export const applicationSourceEnum = pgEnum("application_source", ["Manual", "Gmail"]);

export const applicationsTable = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  opportunityType: opportunityTypeEnum("opportunity_type").notNull(),
  workMode: workModeEnum("work_mode").notNull(),
  applicationDate: date("application_date", { mode: "string" }).notNull(),
  status: applicationStatusEnum("status").notNull(),
  jobUrl: varchar("job_url", { length: 2048 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
  source: applicationSourceEnum("source").notNull().default("Manual"),
  interviewDate: date("interview_date", { mode: "string" }),
  interviewTime: varchar("interview_time", { length: 5 }).notNull().default(""),
  interviewType: varchar("interview_type", { length: 255 }).notNull().default(""),
  interviewLocation: varchar("interview_location", { length: 2048 }).notNull().default(""),
  interviewNotes: text("interview_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("applications_company_nonblank", sql`length(btrim(${table.companyName})) > 0`),
  check("applications_position_nonblank", sql`length(btrim(${table.position})) > 0`),
  check("applications_interview_time_valid", sql`${table.interviewTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR ${table.interviewTime} = ''`),
  check("applications_interview_time_requires_date", sql`${table.interviewTime} = '' OR ${table.interviewDate} IS NOT NULL`),
]);

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type ApplicationRow = typeof applicationsTable.$inferSelect;