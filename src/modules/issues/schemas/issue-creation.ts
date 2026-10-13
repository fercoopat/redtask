import { z } from "zod";

const positiveId = z.number().int().positive();

export const issueDraftSchema = z.object({
  projectId: positiveId,
  trackerId: positiveId.optional(),
  subject: z.string().trim().min(1).max(255),
  description: z.string().max(20_000).optional().default(""),
  priorityId: positiveId.optional(),
  categoryId: positiveId.optional(),
  customFields: z
    .array(z.object({ id: positiveId, value: z.union([z.string(), z.array(z.string())]) }))
    .default([]),
});

export const projectChoiceSchema = z.object({ id: positiveId, name: z.string().min(1) });
export const redmineValidationMessagesSchema = z.object({ errors: z.array(z.string()) });
export const issueCreateOptionsSchema = z.object({
  projectId: positiveId,
  trackers: z.array(projectChoiceSchema),
  categories: z.array(projectChoiceSchema),
  priorities: z.array(projectChoiceSchema),
  customFields: z.array(
    z.object({
      id: positiveId,
      name: z.string(),
      fieldFormat: z.string().optional(),
      required: z.boolean().optional(),
      possibleValues: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
    }),
  ),
});

export const createdIssueSchema = z.object({
  id: positiveId,
  subject: z.string(),
  url: z.string().url(),
});

export type IssueDraft = z.input<typeof issueDraftSchema>;
export type IssueDraftOutput = z.output<typeof issueDraftSchema>;
export type IssueDraftInput = IssueDraft;
export type ProjectChoice = z.infer<typeof projectChoiceSchema>;
export type IssueCreateOptions = z.infer<typeof issueCreateOptionsSchema>;
export type CreatedIssue = z.infer<typeof createdIssueSchema>;

export const projectIdQuerySchema = z.coerce.number().int().positive();
