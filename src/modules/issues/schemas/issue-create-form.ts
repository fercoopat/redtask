import { z } from "zod";

import { type IssueCreateOptions, issueDraftSchema } from "./issue-creation";

export function createIssueFormSchema(options?: IssueCreateOptions) {
  return issueDraftSchema
    .omit({ customFields: true })
    .extend({
      customFieldValues: z.record(z.string(), z.string()).default({}),
    })
    .superRefine((draft, ctx) => {
      if (!options || options.projectId !== draft.projectId) {
        ctx.addIssue({ code: "custom", path: ["projectId"], message: "selectProject" });
        return;
      }
      if (options.trackers.length && !options.trackers.some((item) => item.id === draft.trackerId))
        ctx.addIssue({ code: "custom", path: ["trackerId"], message: "selectTracker" });
      for (const [name, choices] of [
        ["categoryId", options.categories],
        ["priorityId", options.priorities],
      ] as const) {
        if (draft[name] !== undefined && !choices.some((item) => item.id === draft[name]))
          ctx.addIssue({ code: "custom", path: [name], message: "invalidIssueDraft" });
      }
      for (const field of options.customFields) {
        const value = draft.customFieldValues[String(field.id)] ?? "";
        if (field.required && !value.trim())
          ctx.addIssue({
            code: "custom",
            path: ["customFieldValues", String(field.id)],
            message: "requiredField",
          });
        if (
          value &&
          field.possibleValues?.length &&
          !field.possibleValues.some((item) => item.value === value)
        )
          ctx.addIssue({
            code: "custom",
            path: ["customFieldValues", String(field.id)],
            message: "invalidIssueDraft",
          });
      }
    })
    .transform(({ customFieldValues, ...draft }) => ({
      ...draft,
      customFields: (options?.customFields ?? []).map((field) => ({
        id: field.id,
        value: customFieldValues[String(field.id)] ?? "",
      })),
    }));
}
export type IssueCreateFormInput = z.input<ReturnType<typeof createIssueFormSchema>>;
