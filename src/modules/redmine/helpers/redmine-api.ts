import { z } from "zod";

import type { RedmineUser } from "@/modules/auth/helpers/session";
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

export async function getRedmineIssues(apiKey: string): Promise<RedmineIssuePage> {
  const result = issueListResponseSchema.safeParse(
    await requestRedmine("issues.json?limit=25", apiKey),
  );
  if (!result.success) throw new RedmineRequestError("unexpected");

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
