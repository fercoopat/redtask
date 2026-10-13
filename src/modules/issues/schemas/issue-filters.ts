import { z } from "zod";

import type { IssueFilterOption } from "@/modules/issues/helpers/issue-filter-options";

export function createIssueFilterSchema(options: IssueFilterOption[]) {
  return z
    .object({
      field: z.string().min(1, "invalidFilterField"),
      operator: z.string().min(1, "invalidFilterOperator"),
      value: z.string().trim().max(200, "invalidFilterValue").optional(),
    })
    .superRefine((filter, ctx) => {
      const field = options.find((option) => option.field === filter.field);
      if (!field) {
        ctx.addIssue({ code: "custom", path: ["field"], message: "invalidFilterField" });
        return;
      }
      const operator = field.operators.find((item) => item.value === filter.operator);
      if (!operator) {
        ctx.addIssue({ code: "custom", path: ["operator"], message: "invalidFilterOperator" });
        return;
      }
      const value = filter.value ?? "";
      if (operator.requiresValue && !value) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "filterValueRequired" });
        return;
      }
      let valid = !value || operator.requiresValue;
      if (operator.requiresValue && field.values)
        valid = field.values.some((item) => item.value === value);
      if (operator.requiresValue && field.type === "list" && !field.values)
        valid = /^[1-9]\d*$/.test(value);
      if (operator.requiresValue && field.type === "number") {
        valid =
          Number.isFinite(Number(value)) &&
          (field.numericKind === "integer"
            ? /^[+-]?\d+$/.test(value)
            : /^[+-]?\d+(\.\d*)?$/.test(value));
        if (field.field === "done_ratio")
          valid = valid && Number(value) >= 0 && Number(value) <= 100;
        if (field.field === "estimated_hours") valid = valid && Number(value) >= 0;
      }
      if (operator.requiresValue && field.type === "date") {
        const date = new Date(`${value}T00:00:00.000Z`);
        valid =
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(date.valueOf()) &&
          date.toISOString().slice(0, 10) === value;
      }
      if (!valid) ctx.addIssue({ code: "custom", path: ["value"], message: "invalidFilterValue" });
    });
}

export function createIssueFiltersSchema(options: IssueFilterOption[]) {
  return z
    .array(createIssueFilterSchema(options))
    .max(20)
    .superRefine((filters, ctx) => {
      const seen = new Set<string>();
      filters.forEach((filter, index) => {
        if (seen.has(filter.field))
          ctx.addIssue({ code: "custom", path: [index, "field"], message: "duplicateFilter" });
        seen.add(filter.field);
      });
    });
}
