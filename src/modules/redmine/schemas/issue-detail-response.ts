import { z } from "zod";

const statusSchema = z.object({ id: z.number().int().positive(), name: z.string() });
export const issueDetailResponseSchema = z.object({
  issue: z.object({
    id: z.number().int().positive(),
    status: statusSchema,
    updated_on: z.string().optional(),
    allowed_statuses: z.array(statusSchema).optional(),
  }),
});
