import { z } from "zod";
export const createdIssueResponseSchema = z.object({
  issue: z.object({ id: z.number().int().positive(), subject: z.string() }),
});
