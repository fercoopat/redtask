import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { getRedmineTimeEntries, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { jsonResponse } from "@/shared/http";

import { parseSpentTimeQuery } from "../helpers/spent-time-query";
import { getSpentTimeChoices, summarizeSpentTime } from "../helpers/spent-time-summary";

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return apiErrorResponse("session_required", 401);

    const query = parseSpentTimeQuery(new URL(request.url).searchParams);
    if (!query) return apiErrorResponse("invalid_spent_time_query", 400);

    const completeEntries = await getRedmineTimeEntries(session.apiKey, session.userId, query);
    const choices = getSpentTimeChoices(completeEntries);
    if (
      (query.projectId && !choices.projects.some(({ id }) => id === query.projectId)) ||
      (query.activityId && !choices.activities.some(({ id }) => id === query.activityId))
    ) {
      return apiErrorResponse("invalid_spent_time_query", 400);
    }

    const filteredEntries = completeEntries.filter(
      (entry) =>
        (!query.projectId || entry.project.id === query.projectId) &&
        (!query.activityId || entry.activity.id === query.activityId),
    );
    const summary = summarizeSpentTime(filteredEntries, query);
    const start = (query.page - 1) * query.pageSize;
    return jsonResponse({
      filters: {
        from: query.from,
        to: query.to,
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.activityId ? { activityId: query.activityId } : {}),
      },
      entries: filteredEntries.slice(start, start + query.pageSize),
      totalCount: filteredEntries.length,
      page: query.page,
      pageSize: query.pageSize,
      ...summary,
      ...choices,
    });
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      if (error.failure === "unauthorized") {
        try {
          await clearSession();
        } catch {
          /* Deny access even if cleanup fails. */
        }
        return apiErrorResponse("api_key_revoked", 401);
      }
      if (error.failure === "forbidden") return apiErrorResponse("spent_time_forbidden", 403);
      if (error.failure === "unavailable") return apiErrorResponse("redmine_unavailable", 503);
    }
    return apiErrorResponse("spent_time_load_failed", 502);
  }
}
