import { z } from "zod";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import {
  type IssueFilterCriterion,
  standardIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import {
  createdIssueSchema,
  issueCreateOptionsSchema,
  type IssueDraft,
  issueDraftSchema,
  type ProjectChoice,
  redmineValidationMessagesSchema,
} from "@/modules/issues/schemas/issue-creation";
import {
  issueIdSchema,
  type IssueStatusChange,
  issueStatusChangeSchema,
  type IssueStatusInfo,
} from "@/modules/issues/schemas/issue-status";
import {
  issueStatusesResponseSchema,
  prioritiesResponseSchema,
  projectCreateResponseSchema,
  projectMembershipsResponseSchema,
  projectsResponseSchema,
  trackersResponseSchema,
} from "@/modules/redmine/schemas/create-options-response";
import { createdIssueResponseSchema } from "@/modules/redmine/schemas/created-issue-response";
import { currentUserResponseSchema } from "@/modules/redmine/schemas/current-user-response";
import { issueDetailResponseSchema } from "@/modules/redmine/schemas/issue-detail-response";
import { issueListResponseSchema } from "@/modules/redmine/schemas/issue-list-response";
import {
  redmineTimeEntriesResponseSchema,
  type RedmineTimeEntry,
} from "@/modules/redmine/schemas/time-entry-response";
import { getAppConfig } from "@/shared/config";

export type RedmineIssueSummary = {
  id: number;
  subject: string;
  project: string;
  status: string;
  statusId: number | null;
  url: string;
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

export type RedmineFailure =
  | "unauthorized"
  | "forbidden"
  | "unavailable"
  | "validation"
  | "unexpected"
  | "conflict"
  | "transition"
  | "update_unknown";

export class RedmineRequestError extends Error {
  constructor(
    readonly failure: RedmineFailure,
    readonly messages: string[] = [],
    readonly status?: number,
  ) {
    super(failure);
    this.name = "RedmineRequestError";
  }
}

export async function requestRedmineResponse(
  path: string,
  apiKey: string,
  body?: unknown,
  method: "GET" | "POST" | "PUT" = body === undefined ? "GET" : "POST",
): Promise<Response> {
  const { redmineBaseUrl } = getAppConfig();
  const url = new URL(path.replace(/^\/+/, ""), `${redmineBaseUrl}/`);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "X-Redmine-API-Key": apiKey,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RedmineRequestError("unavailable");
  }

  return response;
}

async function requestRedmine(
  path: string,
  apiKey: string,
  body?: unknown,
  method?: "GET" | "POST" | "PUT",
): Promise<unknown> {
  const response = await requestRedmineResponse(path, apiKey, body, method);
  if (!response.ok) {
    if (response.status === 401) throw new RedmineRequestError("unauthorized", [], response.status);
    if (response.status === 403) throw new RedmineRequestError("forbidden", [], response.status);
    if (response.status === 409) throw new RedmineRequestError("conflict", [], 409);
    if (response.status === 422) {
      const parsed = redmineValidationMessagesSchema.safeParse(
        await response.json().catch(() => null),
      );
      throw new RedmineRequestError(
        "validation",
        parsed.success
          ? parsed.data.errors
              .slice(0, 10)
              .map((message) => message.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 300))
          : [],
      );
    }
    if (response.status >= 500) throw new RedmineRequestError("unavailable", [], response.status);
    throw new RedmineRequestError("unexpected", [], response.status);
  }

  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    throw new RedmineRequestError("unexpected");
  }
}

export async function getRedmineProjects(apiKey: string): Promise<ProjectChoice[]> {
  // ponytail: the selector shows the first 100 projects; paginate if the instance exceeds that.
  const parsed = projectsResponseSchema.safeParse(
    await requestRedmine("projects.json?limit=100", apiKey),
  );
  if (!parsed.success) throw new RedmineRequestError("unexpected");
  return parsed.data.projects;
}

export async function getRedmineIssueCreateOptions(apiKey: string, projectId: number) {
  const project = projectCreateResponseSchema.safeParse(
    await requestRedmine(
      `projects/${projectId}.json?include=trackers,issue_categories,issue_custom_fields`,
      apiKey,
    ),
  );
  if (!project.success || project.data.project.id !== projectId)
    throw new RedmineRequestError("unexpected");

  let priorities: ProjectChoice[] = [];
  try {
    const parsed = prioritiesResponseSchema.safeParse(
      await requestRedmine("enumerations/issue_priorities.json", apiKey),
    );
    if (!parsed.success) throw new RedmineRequestError("unexpected");
    priorities = parsed.data.issue_priorities;
  } catch (error) {
    if (!(error instanceof RedmineRequestError) || ![404, 501].includes(error.status ?? 0))
      throw error;
  }
  const result = issueCreateOptionsSchema.safeParse({
    projectId,
    trackers: project.data.project.trackers,
    categories: project.data.project.issue_categories,
    priorities,
    customFields: project.data.project.issue_custom_fields.map((field) => ({
      id: field.id,
      name: field.name,
      fieldFormat: field.field_format,
      required: field.is_required,
      ...(field.possible_values
        ? {
            possibleValues: field.possible_values.map((value) =>
              typeof value === "string" ? { value, label: value } : value,
            ),
          }
        : {}),
    })),
  });
  if (!result.success) throw new RedmineRequestError("unexpected");
  return result.data;
}

export async function createRedmineIssue(apiKey: string, draft: IssueDraft) {
  const validated = issueDraftSchema.safeParse(draft);
  if (!validated.success) throw new RedmineRequestError("unexpected");
  const result = createdIssueResponseSchema.safeParse(
    await requestRedmine("issues.json", apiKey, {
      issue: {
        project_id: validated.data.projectId,
        ...(validated.data.trackerId ? { tracker_id: validated.data.trackerId } : {}),
        subject: validated.data.subject,
        ...(validated.data.description ? { description: validated.data.description } : {}),
        ...(validated.data.priorityId ? { priority_id: validated.data.priorityId } : {}),
        ...(validated.data.categoryId ? { category_id: validated.data.categoryId } : {}),
        ...(validated.data.customFields.length
          ? {
              custom_fields: validated.data.customFields.map((field) => ({
                id: field.id,
                value: field.value,
              })),
            }
          : {}),
      },
    }),
  );
  if (!result.success) throw new RedmineRequestError("unexpected");
  const { redmineBaseUrl } = getAppConfig();
  return createdIssueSchema.parse({
    id: result.data.issue.id,
    subject: result.data.issue.subject,
    url: new URL(`issues/${result.data.issue.id}`, `${redmineBaseUrl}/`).toString(),
  });
}

export async function getRedmineCurrentUser(apiKey: string): Promise<RedmineUser> {
  const result = currentUserResponseSchema.safeParse(
    await requestRedmine("users/current.json", apiKey),
  );
  if (!result.success) throw new RedmineRequestError("unexpected");
  return result.data.user;
}

export async function getRedmineIssueFilterFields(apiKey: string) {
  const [statuses, trackers, priorities, projects] = await Promise.all([
    getOptionalFilterChoices(
      "issue_statuses.json",
      "issue_statuses",
      issueStatusesResponseSchema,
      apiKey,
    ),
    getOptionalFilterChoices("trackers.json", "trackers", trackersResponseSchema, apiKey),
    getOptionalFilterChoices(
      "enumerations/issue_priorities.json",
      "issue_priorities",
      prioritiesResponseSchema,
      apiKey,
    ),
    getRedmineProjects(apiKey),
  ]);
  const users = await getOptionalProjectMemberChoices(apiKey, projects);
  const valuesByField = new Map([
    ["status_id", statuses],
    ["tracker_id", trackers],
    ["priority_id", priorities],
    ["project_id", projects],
    ["author_id", users],
    ["assigned_to_id", users],
  ]);
  return standardIssueFilters.map((field) => {
    const values = valuesByField.get(field.field);
    return values?.length
      ? {
          ...field,
          values: values.map(({ id, name }) => ({ value: String(id), label: name })),
        }
      : field;
  });
}

async function getOptionalProjectMemberChoices(apiKey: string, projects: ProjectChoice[]) {
  try {
    const users = new Map<number, string>();
    // Keep Redmine request fan-out bounded while covering all listed projects.
    for (let start = 0; start < projects.length; start += 8) {
      const batch = await Promise.all(
        projects.slice(start, start + 8).map(async (project) => {
          const users: ProjectChoice[] = [];
          let offset = 0;
          let total = 0;
          do {
            const parsed = projectMembershipsResponseSchema.safeParse(
              await requestRedmine(
                `projects/${project.id}/memberships.json?limit=100&offset=${offset}`,
                apiKey,
              ),
            );
            if (!parsed.success) throw new RedmineRequestError("unexpected");
            total = parsed.data.total_count;
            users.push(
              ...parsed.data.memberships.flatMap((membership) =>
                membership.user ? [membership.user] : [],
              ),
            );
            if (parsed.data.memberships.length === 0 && offset < total)
              throw new RedmineRequestError("unexpected");
            offset += parsed.data.memberships.length;
          } while (offset < total);
          return users;
        }),
      );
      for (const members of batch) {
        for (const user of members) users.set(user.id, user.name);
      }
    }
    return [...users]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error instanceof RedmineRequestError && [403, 404, 501].includes(error.status ?? 0))
      return undefined;
    throw error;
  }
}

async function getOptionalFilterChoices<
  T extends { [key: string]: ProjectChoice[] },
  K extends keyof T & string,
>(path: string, key: K, schema: z.ZodType<T>, apiKey: string): Promise<ProjectChoice[]> {
  try {
    const result = schema.safeParse(await requestRedmine(path, apiKey));
    if (!result.success) throw new RedmineRequestError("unexpected");
    return result.data[key];
  } catch (error) {
    if (error instanceof RedmineRequestError && [403, 404, 501].includes(error.status ?? 0))
      return [];
    throw error;
  }
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
      statusId: issue.status?.id ?? null,
      url: new URL(`issues/${issue.id}`, `${getAppConfig().redmineBaseUrl}/`).toString(),
      priority: issue.priority?.name ?? "",
      assignedTo: issue.assigned_to?.name ?? null,
      updatedAt: issue.updated_on ?? "",
    })),
    totalCount: result.data.total_count,
    offset: result.data.offset,
    limit: result.data.limit,
  };
}

export async function getRedmineTimeEntries(
  apiKey: string,
  userId: number,
  range: { from: string; to: string },
): Promise<RedmineTimeEntry[]> {
  const entries: RedmineTimeEntry[] = [];
  const seenIds = new Set<number>();
  const pageSize = 100;
  let offset = 0;
  let totalCount: number | undefined;

  while (totalCount === undefined || offset < totalCount) {
    const params = new URLSearchParams({
      user_id: String(userId),
      from: range.from,
      to: range.to,
      limit: String(pageSize),
      offset: String(offset),
    });
    const result = redmineTimeEntriesResponseSchema.safeParse(
      await requestRedmine(`time_entries.json?${params.toString()}`, apiKey),
    );
    if (!result.success) throw new RedmineRequestError("unexpected");

    const page = result.data;
    if (
      page.offset !== offset ||
      page.total_count !== (totalCount ?? page.total_count) ||
      page.time_entries.length > page.limit ||
      (page.time_entries.length === 0 && offset < page.total_count)
    ) {
      throw new RedmineRequestError("unexpected");
    }

    totalCount = page.total_count;
    for (const entry of page.time_entries) {
      if (seenIds.has(entry.id)) throw new RedmineRequestError("unexpected");
      seenIds.add(entry.id);
      entries.push(entry);
    }
    offset += page.time_entries.length;
  }

  if (entries.length !== totalCount) throw new RedmineRequestError("unexpected");
  return entries;
}

export async function getRedmineIssueStatus(apiKey: string, id: number): Promise<IssueStatusInfo> {
  if (!issueIdSchema.safeParse(id).success) throw new RedmineRequestError("unexpected");
  const parsed = issueDetailResponseSchema.safeParse(
    await requestRedmine(`issues/${id}.json?include=allowed_statuses`, apiKey),
  );
  if (!parsed.success || parsed.data.issue.id !== id) throw new RedmineRequestError("unexpected");
  const issue = parsed.data.issue;
  return {
    id,
    statusId: issue.status.id,
    status: issue.status.name,
    updatedAt: issue.updated_on ?? "",
    url: new URL(`issues/${id}`, `${getAppConfig().redmineBaseUrl}/`).toString(),
    allowedStatuses: issue.allowed_statuses ?? [],
  };
}

export async function changeRedmineIssueStatus(
  apiKey: string,
  id: number,
  input: IssueStatusChange,
) {
  const parsed = issueStatusChangeSchema.safeParse(input);
  if (!parsed.success) throw new RedmineRequestError("unexpected");
  const { statusId, expectedStatusId } = parsed.data;
  const current = await getRedmineIssueStatus(apiKey, id);
  if (current.statusId !== expectedStatusId) throw new RedmineRequestError("conflict", [], 409);
  if (statusId === current.statusId) return current;
  if (!current.allowedStatuses.some((status) => status.id === statusId))
    throw new RedmineRequestError("transition", [], 403);
  try {
    await requestRedmine(`issues/${id}.json`, apiKey, { issue: { status_id: statusId } }, "PUT");
  } catch (error) {
    if (
      error instanceof RedmineRequestError &&
      ["unauthorized", "forbidden", "validation", "conflict"].includes(error.failure)
    )
      throw error;
    throw new RedmineRequestError("update_unknown");
  }
  try {
    const result = await getRedmineIssueStatus(apiKey, id);
    if (result.statusId !== statusId) throw new RedmineRequestError("update_unknown");
    return result;
  } catch (error) {
    if (error instanceof RedmineRequestError && error.failure === "unauthorized") throw error;
    throw new RedmineRequestError("update_unknown");
  }
}
