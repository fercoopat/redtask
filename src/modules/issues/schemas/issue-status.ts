import { z } from "zod";

export const issueIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const issueStatusChangeSchema = z.strictObject({
  statusId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  expectedStatusId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export type IssueStatusChange = z.infer<typeof issueStatusChangeSchema>;
export const issueStatusInfoSchema = z.object({
  id: z.number().int().positive(),
  statusId: z.number().int().positive(),
  status: z.string(),
  updatedAt: z.string(),
  url: z.url(),
  allowedStatuses: z.array(z.object({ id: z.number().int().positive(), name: z.string() })),
});
export type IssueStatusInfo = z.infer<typeof issueStatusInfoSchema>;
