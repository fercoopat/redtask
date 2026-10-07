import { z } from "zod";

import type { IssueFilterCriterion } from "./issue-filter-options";

export const issuePageSizes = [10, 25, 50, 100] as const;
const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((value) => issuePageSizes.includes(value as (typeof issuePageSizes)[number]));

export function parseIssueListQuery(params: URLSearchParams) {
  if (params.getAll("page").length > 1 || params.getAll("pageSize").length > 1) return null;
  const filters = new Map<string, Partial<IssueFilterCriterion>>();
  for (const [key, value] of params) {
    if (key === "page" || key === "pageSize") continue;
    const match = /^filter\[([a-zA-Z0-9_]+)]\[(operator|value)]$/.exec(key);
    if (!match) return null;
    const [, field, part] = match;
    if (!filters.has(field) && filters.size >= 20) return null;
    const criterionPart = part as "operator" | "value";
    const current = filters.get(field) ?? {};
    if (current[criterionPart] !== undefined || value.length > 200) return null;
    current[criterionPart] = value;
    filters.set(field, current);
  }
  const page = pageSchema.safeParse(params.get("page") ?? "1");
  const pageSize = pageSizeSchema.safeParse(params.get("pageSize") ?? "10");
  if (!page.success || !pageSize.success) return null;
  const criteria: IssueFilterCriterion[] = [];
  for (const [field, criterion] of filters) {
    if (typeof criterion.operator !== "string") return null;
    criteria.push({
      field,
      operator: criterion.operator,
      ...(criterion.value !== undefined ? { value: criterion.value } : {}),
    });
  }
  return { page: page.data, pageSize: pageSize.data, filters: criteria };
}

export function buildIssueListUrl(page: number, pageSize: number, filters: IssueFilterCriterion[]) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  for (const filter of filters) {
    params.set(`filter[${filter.field}][operator]`, filter.operator);
    if (filter.value !== undefined) params.set(`filter[${filter.field}][value]`, filter.value);
  }
  return `/api/issues?${params.toString()}`;
}
