import { getTranslations } from "next-intl/server";

import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import {
  standardIssueFilters,
  validateIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import { parseIssueListQuery } from "@/modules/issues/helpers/issue-list-query";
import {
  getRedmineIssueFilterOptions,
  getRedmineIssues,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { jsonResponse } from "@/shared/http";

export async function GET(request: Request) {
  const t = await getTranslations();
  const query = parseIssueListQuery(new URL(request.url).searchParams);
  if (!query) return jsonResponse({ error: t("invalidIssuesQuery") }, 400);
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      try {
        await clearSession();
      } catch {
        // The response still denies access when a stale cookie cannot be cleared.
      }
      return jsonResponse({ error: t("loginForIssues") }, 401);
    }

    let filterOptions = standardIssueFilters;
    if (query.filters.some((filter) => filter.field.startsWith("cf_"))) {
      try {
        filterOptions = await getRedmineIssueFilterOptions(session.apiKey);
      } catch (error) {
        if (error instanceof RedmineRequestError && error.failure === "forbidden")
          return jsonResponse({ error: t("customFieldsUnavailable") }, 400);
        throw error;
      }
    }
    if (!validateIssueFilters(query.filters, filterOptions))
      return jsonResponse({ error: t("invalidIssuesFilters") }, 400);
    const page = await getRedmineIssues(session.apiKey, query);
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
          return jsonResponse({ error: t("apiKeyRevoked") }, 401);
        case "forbidden":
          return jsonResponse({ error: t("redmineIssuesForbidden") }, 403);
        case "unavailable":
          return jsonResponse({ error: t("redmineUnavailable") }, 503);
        case "unexpected":
          return jsonResponse({ error: t("unexpectedRedmine") }, 502);
      }
    }

    return jsonResponse({ error: t("issuesLoadError") }, 500);
  }
}
