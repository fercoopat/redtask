import { z } from "zod";

export const issuePageSizes = [10, 25, 50, 100] as const;
export const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
export const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((value) => issuePageSizes.includes(value as (typeof issuePageSizes)[number]));
