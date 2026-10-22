import { z } from "zod";

import type { RedmineTimeEntry } from "@/modules/redmine/schemas/time-entry-response";

const optionalIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

const pageSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
  .optional()
  .default(1);

const pageSizeSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(100))
  .optional()
  .default(25);

export const spentTimeQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    projectId: optionalIdSchema.optional(),
    activityId: optionalIdSchema.optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
  })
  .refine((query) => query.from <= query.to, {
    path: ["to"],
    message: "invalid_date_range",
  });

export type SpentTimeQuery = z.infer<typeof spentTimeQuerySchema>;
export type SpentTimePeriod = "daily" | "weekly" | "monthly";

export const spentTimeRangeSchema = z.object({ from: z.iso.date(), to: z.iso.date() });

export const spentTimeChoiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

const spentTimeEntrySchema = z.object({
  id: z.number().int().positive(),
  spentOn: z.iso.date(),
  hours: z.number().finite().positive(),
  project: spentTimeChoiceSchema,
  activity: spentTimeChoiceSchema,
  issue: z.object({ id: z.number().int().positive(), subject: z.string().optional() }).optional(),
  comments: z.string().optional(),
});

const spentTimeGroupSchema = spentTimeChoiceSchema.extend({
  hours: z.number().finite().nonnegative(),
});

export const spentTimeReportSchema = z.object({
  filters: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    projectId: z.number().int().positive().optional(),
    activityId: z.number().int().positive().optional(),
  }),
  entries: z.array(spentTimeEntrySchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  totalHours: z.number().finite().nonnegative(),
  trend: z.object({
    period: z.enum(["daily", "weekly", "monthly"]),
    buckets: z.array(z.object({ period: z.iso.date(), hours: z.number().finite().nonnegative() })),
  }),
  distribution: z.object({
    projects: z.array(spentTimeGroupSchema),
    activities: z.array(spentTimeGroupSchema),
  }),
  projects: z.array(spentTimeChoiceSchema),
  activities: z.array(spentTimeChoiceSchema),
});

export type SpentTimeReport = z.infer<typeof spentTimeReportSchema>;
export type SpentTimeEntry = RedmineTimeEntry;
