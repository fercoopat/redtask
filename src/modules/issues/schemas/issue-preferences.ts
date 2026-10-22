import { z } from "zod";

import { issuePageSizes } from "@/modules/issues/schemas/issue-list-query";

export const savedFilterSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  filters: z
    .array(z.object({ field: z.string(), operator: z.string(), value: z.string().optional() }))
    .max(20),
});
export const preferencesSchema = z.object({
  version: z.literal(1).default(1),
  view: z.enum(["list", "board"]).default("list"),
  boardProjectId: z.number().int().positive().nullable().default(null),
  pageSize: z
    .number()
    .refine((n) => issuePageSizes.includes(n as (typeof issuePageSizes)[number]))
    .default(10),
  visibleFields: z.array(z.string()).default(["status_id", "assigned_to_id", "project_id"]),
  savedFilters: z.array(savedFilterSchema).default([]),
});
export type SavedIssueFilter = z.infer<typeof savedFilterSchema>;
export type IssueListPreferences = z.infer<typeof preferencesSchema>;
