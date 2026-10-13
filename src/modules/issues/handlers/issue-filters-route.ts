import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { standardIssueFilters } from "@/modules/issues/helpers/issue-filter-options";
import { getRedmineCurrentUser, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { getAppConfig } from "@/shared/config";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { jsonResponse } from "@/shared/http";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return apiErrorResponse("session_required", 401);
    const user = await getRedmineCurrentUser(session.apiKey);
    if (user.id !== session.userId) throw new RedmineRequestError("unauthorized");
    return jsonResponse({
      fields: standardIssueFilters,
      instance: getAppConfig().redmineBaseUrl,
    });
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      if (error.failure === "unauthorized") {
        try {
          await clearSession();
        } catch {
          /* Deny this request even if stale session cleanup fails. */
        }
        return apiErrorResponse("api_key_revoked", 401);
      }
      return apiErrorResponse(
        "filters_load_failed",
        error.failure === "forbidden" ? 403 : error.failure === "unavailable" ? 503 : 502,
      );
    }
    return apiErrorResponse("filters_load_failed", 500);
  }
}
