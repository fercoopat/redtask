import { z } from "zod";

import type { IssueFilterCriterion } from "./issue-filter-options";
import { issuePageSizes } from "./issue-list-query";

const savedFilterSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  filters: z
    .array(z.object({ field: z.string(), operator: z.string(), value: z.string().optional() }))
    .max(20),
});
const preferencesSchema = z.object({
  version: z.literal(1).default(1),
  pageSize: z
    .number()
    .refine((n) => issuePageSizes.includes(n as (typeof issuePageSizes)[number]))
    .default(10),
  visibleFields: z.array(z.string()).default(["status_id", "assigned_to_id", "project_id"]),
  savedFilters: z.array(savedFilterSchema).default([]),
});
export type SavedIssueFilter = { id: string; name: string; filters: IssueFilterCriterion[] };
export type IssueListPreferences = z.infer<typeof preferencesSchema>;

export function issuePreferencesKey(userId: number, redmineBaseUrl: string) {
  return `redmine-ui:issues:v1:${encodeURIComponent(redmineBaseUrl)}:${userId}`;
}
export function readIssuePreferences(userId: number, redmineBaseUrl: string): IssueListPreferences {
  try {
    return preferencesSchema.parse(
      JSON.parse(localStorage.getItem(issuePreferencesKey(userId, redmineBaseUrl)) ?? "{}"),
    );
  } catch {
    return {
      version: 1,
      pageSize: 10,
      visibleFields: ["status_id", "assigned_to_id", "project_id"],
      savedFilters: [],
    };
  }
}
export function writeIssuePreferences(
  userId: number,
  redmineBaseUrl: string,
  preferences: IssueListPreferences,
) {
  try {
    localStorage.setItem(issuePreferencesKey(userId, redmineBaseUrl), JSON.stringify(preferences));
  } catch {
    /* Storage can be disabled or full. */
  }
}
