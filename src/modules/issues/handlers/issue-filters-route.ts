import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { standardIssueFilters } from "@/modules/issues/helpers/issue-filter-options";
import {
  getRedmineIssueFilterOptions,
  RedmineRequestError,
} from "@/modules/redmine/helpers/redmine-api";
import { getAppConfig } from "@/shared/config";
import { jsonResponse } from "@/shared/http";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return jsonResponse({ error: "Inicia sesión para ver los filtros." }, 401);
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
        return jsonResponse(
          { error: "La API Key dejó de tener acceso. Inicia sesión de nuevo." },
          401,
        );
      }
      return jsonResponse(
        { error: "No se pudieron cargar los filtros de Redmine." },
        error.failure === "unavailable" ? 503 : 502,
      );
    }
    return jsonResponse({ error: "No se pudieron cargar los filtros." }, 500);
  }
}
