import { z } from "zod";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import {
  type IssueFilterCriterion,
  type IssueFilterOption,
  standardIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import { getAppConfig } from "@/shared/config";

const currentUserResponseSchema = z.object({
  user: z.object({
    id: z.number().int().positive(),
    login: z.string().min(1),
  }),
});

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

const issueListResponseSchema = z.object({
  issues: z.array(issueResponseSchema),
  total_count: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

export type RedmineIssueSummary = {
  id: number;
  subject: string;
  project: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  updatedAt: string;
};

export type RedmineIssuePage = {
  issues: RedmineIssueSummary[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type RedmineFailure = "unauthorized" | "forbidden" | "unavailable" | "unexpected";

export class RedmineRequestError extends Error {
  constructor(readonly failure: RedmineFailure) {
    super(failure);
    this.name = "RedmineRequestError";
  }
}

async function requestRedmine(path: string, apiKey: string): Promise<unknown> {
  const { redmineBaseUrl } = getAppConfig();
  const url = new URL(path.replace(/^\/+/, ""), `${redmineBaseUrl}/`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Redmine-API-Key": apiKey,
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RedmineRequestError("unavailable");
  }

  if (!response.ok) {
    if (response.status === 401) throw new RedmineRequestError("unauthorized");
    if (response.status === 403) throw new RedmineRequestError("forbidden");
    throw new RedmineRequestError("unexpected");
  }

  try {
    return await response.json();
  } catch {
    throw new RedmineRequestError("unexpected");
  }
}

export async function getRedmineCurrentUser(apiKey: string): Promise<RedmineUser> {
  const result = currentUserResponseSchema.safeParse(
    await requestRedmine("users/current.json", apiKey),
  );
  if (!result.success) throw new RedmineRequestError("unexpected");
  return result.data.user;
}

export async function getRedmineIssueFilterOptions(apiKey: string): Promise<IssueFilterOption[]> {
  const parsed = z
    .object({
      custom_fields: z.array(
        z.object({
          id: z.number().int().positive(),
          name: z.string(),
          customized_type: z.string(),
          field_format: z.string(),
          is_filter: z.boolean().optional(),
          possible_values: z
            .array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })]))
            .optional(),
        }),
      ),
    })
    .safeParse(await requestRedmine("custom_fields.json", apiKey));
  if (!parsed.success) throw new RedmineRequestError("unexpected");
  const customs: IssueFilterOption[] = parsed.data.custom_fields
    .filter((field) => field.customized_type === "issue" && field.is_filter)
    .map((field) => ({
      field: `cf_${field.id}`,
      label: field.name,
      type:
        field.field_format === "date"
          ? "date"
          : ["int", "float"].includes(field.field_format)
            ? "number"
            : field.possible_values?.length
              ? "list"
              : "text",
      operators:
        field.field_format === "date"
          ? [
              { value: "=", label: "es", requiresValue: true },
              { value: ">=", label: "desde", requiresValue: true },
              { value: "<=", label: "hasta", requiresValue: true },
            ]
          : field.possible_values?.length
            ? [
                { value: "=", label: "es", requiresValue: true },
                { value: "!", label: "no es", requiresValue: true },
              ]
            : field.field_format === "int" || field.field_format === "float"
              ? [
                  { value: "=", label: "es", requiresValue: true },
                  { value: ">", label: "mayor que", requiresValue: true },
                  { value: "<", label: "menor que", requiresValue: true },
                ]
              : [
                  { value: "~", label: "contiene", requiresValue: true },
                  { value: "!~", label: "no contiene", requiresValue: true },
                ],
      ...(field.possible_values?.length
        ? {
            values: field.possible_values.map((v) =>
              typeof v === "string" ? { value: v, label: v } : v,
            ),
          }
        : {}),
    }));
  return [...standardIssueFilters, ...customs];
}

export async function getRedmineIssues(
  apiKey: string,
  options: { page: number; pageSize: number; filters: IssueFilterCriterion[] },
): Promise<RedmineIssuePage> {
  const buildPath = (page: number) => {
    const params = new URLSearchParams({
      limit: String(options.pageSize),
      offset: String((page - 1) * options.pageSize),
    });
    if (options.filters.length) {
      params.set("set_filter", "1");
      options.filters.forEach((filter) => {
        params.append("f[]", filter.field);
        params.set(`op[${filter.field}]`, filter.operator);
        if (filter.value !== undefined) params.append(`v[${filter.field}][]`, filter.value);
      });
    }
    return `issues.json?${params.toString()}`;
  };
  const result = issueListResponseSchema.safeParse(
    await requestRedmine(buildPath(options.page), apiKey),
  );
  if (!result.success) throw new RedmineRequestError("unexpected");

  const lastPage = Math.max(1, Math.ceil(result.data.total_count / options.pageSize));
  if (result.data.total_count > 0 && options.page > lastPage) {
    return getRedmineIssues(apiKey, { ...options, page: lastPage });
  }

  return {
    issues: result.data.issues.map((issue) => ({
      id: issue.id,
      subject: issue.subject,
      project: issue.project?.name ?? "",
      status: issue.status?.name ?? "",
      priority: issue.priority?.name ?? "",
      assignedTo: issue.assigned_to?.name ?? null,
      updatedAt: issue.updated_on ?? "",
    })),
    totalCount: result.data.total_count,
    offset: result.data.offset,
    limit: result.data.limit,
  };
}
