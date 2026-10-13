import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { projectIdQuerySchema } from "@/modules/issues/schemas/issue-creation";
import {
  getRedmineIssueCreateOptions,
  getRedmineProjects,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { jsonResponse } from "@/shared/http";

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return apiErrorResponse("session_required", 401);
    const projectIdValue = new URL(request.url).searchParams.get("projectId");
    if (!projectIdValue)
      return jsonResponse({ projects: await getRedmineProjects(session.apiKey) });
    const projectId = projectIdQuerySchema.safeParse(projectIdValue);
    if (!projectId.success) return apiErrorResponse("invalid_issue_draft", 400);
    const projects = await getRedmineProjects(session.apiKey);
    if (!projects.some((project) => project.id === projectId.data))
      return apiErrorResponse("issue_project_unavailable", 400);
    return jsonResponse(await getRedmineIssueCreateOptions(session.apiKey, projectId.data));
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
      return apiErrorResponse(
        "create_options_failed",
        error.failure === "forbidden" ? 403 : error.failure === "unavailable" ? 503 : 502,
      );
    }
    return apiErrorResponse("create_options_failed", 500);
  }
}
