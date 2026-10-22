import { z } from "zod";

const timeEntryReferenceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

export const redmineTimeEntrySchema = z
  .object({
    id: z.number().int().positive(),
    spent_on: z.iso.date(),
    hours: z.number().finite().positive(),
    project: timeEntryReferenceSchema,
    activity: timeEntryReferenceSchema,
    issue: z
      .object({
        id: z.number().int().positive(),
        subject: z.string().optional(),
      })
      .optional(),
    comments: z.string().optional(),
  })
  .transform(({ spent_on, ...entry }) => ({ ...entry, spentOn: spent_on }));

export type RedmineTimeEntry = z.infer<typeof redmineTimeEntrySchema>;

export const redmineTimeEntriesResponseSchema = z.object({
  time_entries: z.array(redmineTimeEntrySchema),
  total_count: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
