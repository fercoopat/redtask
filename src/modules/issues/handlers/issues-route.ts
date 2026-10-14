import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { standardIssueFilters } from "@/modules/issues/helpers/issue-filter-options";
import { parseIssueListQuery } from "@/modules/issues/helpers/issue-list-query";
import { issueDraftSchema } from "@/modules/issues/schemas/issue-creation";
import { createIssueFiltersSchema } from "@/modules/issues/schemas/issue-filters";
import {
  createRedmineIssue,
  getRedmineIssues,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { isSameOriginRequest, jsonResponse } from "@/shared/http";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiErrorResponse("request_not_allowed", 403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json")
    return apiErrorResponse("invalid_request_format", 415);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("invalid_request_format", 400);
  }
  const parsed = issueDraftSchema.safeParse(body);
  if (!parsed.success) return apiErrorResponse("invalid_issue_draft", 400);
  const session = await getAuthenticatedSession();
  if (!session) {
    try {
      await clearSession();
    } catch {
      // Deny access even when the stale cookie cannot be cleared.
    }
    return apiErrorResponse("session_required", 401);
  }
  try {
    const issue = await createRedmineIssue(session.apiKey, parsed.data);
    return jsonResponse({ issue }, 201);
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      if (error.failure === "unauthorized") {
        try {
          await clearSession();
        } catch {
          /* Deny access if stale session cleanup fails. */
        }
        return apiErrorResponse("api_key_revoked", 401);
      }
      if (error.failure === "forbidden") return apiErrorResponse("issue_create_forbidden", 403);
      if (error.failure === "validation")
        return apiErrorResponse("issue_create_validation", 422, error.messages.slice(0, 10));
      if (error.failure === "unavailable") return apiErrorResponse("issue_create_unknown", 503);
      return apiErrorResponse("redmine_unexpected", 502);
    }
    return apiErrorResponse("redmine_unexpected", 500);
  }
}

export async function GET(request: Request) {
  const query = parseIssueListQuery(new URL(request.url).searchParams);
  if (!query) return apiErrorResponse("invalid_issues_query", 400);
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      try {
        await clearSession();
      } catch {
        // The response still denies access when a stale cookie cannot be cleared.
      }
      return apiErrorResponse("session_required", 401);
    }

    if (query.filters.some((filter) => filter.field.startsWith("cf_")))
      return apiErrorResponse("custom_fields_unavailable", 400);
    const validatedFilters = createIssueFiltersSchema(standardIssueFilters, {
      allowUncataloguedListIds: true,
    }).safeParse(query.filters);
    if (!validatedFilters.success) return apiErrorResponse("invalid_issues_filters", 400);
    const page = await getRedmineIssues(session.apiKey, {
      ...query,
      filters: validatedFilters.data,
    });
    return jsonResponse(page);
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      switch (error.failure) {
        case "unauthorized":
          try {
            await clearSession();
          } catch {
            // The 401 response still prevents this request from showing protected data.
          }
          return apiErrorResponse("api_key_revoked", 401);
        case "forbidden":
          return apiErrorResponse("issues_forbidden", 403);
        case "unavailable":
          return apiErrorResponse("redmine_unavailable", 503);
        case "unexpected":
          return apiErrorResponse("redmine_unexpected", 502);
      }
    }

    return apiErrorResponse("issues_load_failed", 500);
  }
}
