import { z } from "zod";

import { projectChoiceSchema } from "@/modules/issues/schemas/issue-creation";

export const projectCreateResponseSchema = z.object({
  project: z.object({
    id: z.number().int().positive(),
    trackers: z.array(projectChoiceSchema).optional().default([]),
    issue_categories: z.array(projectChoiceSchema).optional().default([]),
    issue_custom_fields: z
      .array(
        z.object({
          id: z.number().int().positive(),
          name: z.string(),
          field_format: z.string().optional(),
          is_required: z.boolean().optional(),
          possible_values: z
            .array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })]))
            .optional(),
        }),
      )
      .optional()
      .default([]),
  }),
});
export const prioritiesResponseSchema = z.object({
  issue_priorities: z.array(projectChoiceSchema),
});
export const projectsResponseSchema = z.object({ projects: z.array(projectChoiceSchema) });
export const projectMembershipsResponseSchema = z.object({
  memberships: z.array(z.object({ user: projectChoiceSchema.optional() })),
  total_count: z.number().int().nonnegative(),
});
export const issueStatusesResponseSchema = z.object({
  issue_statuses: z.array(projectChoiceSchema),
});
export const trackersResponseSchema = z.object({
  trackers: z.array(projectChoiceSchema),
});
