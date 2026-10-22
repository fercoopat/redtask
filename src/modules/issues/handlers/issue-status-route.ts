import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { issueIdSchema, issueStatusChangeSchema } from "@/modules/issues/schemas/issue-status";
import {
  changeRedmineIssueStatus,
  getRedmineIssueStatus,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { isSameOriginRequest, jsonResponse } from "@/shared/http";

type Context = { params: Promise<{ id: string }> };

async function handle(request: Request, context: Context, update: boolean) {
  if (update && !isSameOriginRequest(request)) return apiErrorResponse("request_not_allowed", 403);
  const id = issueIdSchema.safeParse((await context.params).id);
  if (!id.success) return apiErrorResponse("invalid_issue_status", 400);
  let change;
  if (update) {
    if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json")
      return apiErrorResponse("invalid_request_format", 415);
    const body = await request.json().catch(() => null);
    const parsed = issueStatusChangeSchema.safeParse(body);
    if (!parsed.success) return apiErrorResponse("invalid_issue_status", 400);
    change = parsed.data;
  }
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      await clearSession().catch(() => {});
      return apiErrorResponse("session_required", 401);
    }
    const issue = change
      ? await changeRedmineIssueStatus(session.apiKey, id.data, change)
      : await getRedmineIssueStatus(session.apiKey, id.data);
    return jsonResponse({ issue });
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      if (error.failure === "unauthorized") {
        await clearSession().catch(() => {});
        return apiErrorResponse("api_key_revoked", 401);
      }
      if (error.status === 404) return apiErrorResponse("issue_not_found", 404);
      if (error.failure === "conflict") return apiErrorResponse("issue_status_conflict", 409);
      if (error.failure === "forbidden" || error.failure === "transition")
        return apiErrorResponse("issue_status_forbidden", 403);
      if (error.failure === "validation")
        return apiErrorResponse("issue_status_validation", 422, error.messages);
      if (error.failure === "update_unknown") return apiErrorResponse("issue_status_unknown", 503);
      if (error.failure === "unavailable") return apiErrorResponse("redmine_unavailable", 503);
    }
    return apiErrorResponse("redmine_unexpected", 502);
  }
}

export function GET(request: Request, context: Context) {
  return handle(request, context, false);
}
export function PATCH(request: Request, context: Context) {
  return handle(request, context, true);
}
