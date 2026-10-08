import { getTranslations } from "next-intl/server";

import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { standardIssueFilters } from "@/modules/issues/helpers/issue-filter-options";
import {
  getRedmineIssueFilterOptions,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { getAppConfig } from "@/shared/config";
import { jsonResponse } from "@/shared/http";

export async function GET() {
  const t = await getTranslations();
  try {
    const session = await getAuthenticatedSession();
    if (!session) return jsonResponse({ error: t("loginForFilters") }, 401);
    try {
      return jsonResponse({
        fields: await getRedmineIssueFilterOptions(session.apiKey),
        instance: getAppConfig().redmineBaseUrl,
      });
    } catch (error) {
      if (error instanceof RedmineRequestError && error.failure === "forbidden")
        return jsonResponse({
          fields: standardIssueFilters,
          instance: getAppConfig().redmineBaseUrl,
        });
      throw error;
    }
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      if (error.failure === "unauthorized") {
        try {
          await clearSession();
        } catch {
          /* Deny this request even if stale session cleanup fails. */
        }
        return jsonResponse({ error: t("apiKeyRevoked") }, 401);
      }
      return jsonResponse(
        { error: t("filtersLoadError") },
        error.failure === "unavailable" ? 503 : 502,
      );
    }
    return jsonResponse({ error: t("filtersGenericError") }, 500);
  }
}
