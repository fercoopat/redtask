import { z } from "zod";

const namedValueSchema = z.object({ name: z.string() });
const issueResponseSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string(),
  project: namedValueSchema.optional(),
  status: namedValueSchema.optional(),
  priority: namedValueSchema.optional(),
  assigned_to: namedValueSchema.nullable().optional(),
  updated_on: z.string().optional(),
});

export const issueListResponseSchema = z.object({
  issues: z.array(issueResponseSchema),
  total_count: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
