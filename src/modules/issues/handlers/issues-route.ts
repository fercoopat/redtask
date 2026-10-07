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
  const query = parseIssueListQuery(new URL(request.url).searchParams);
  if (!query) return jsonResponse({ error: "Los filtros o la paginación no son válidos." }, 400);
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      try {
        await clearSession();
      } catch {
        // The response still denies access when a stale cookie cannot be cleared.
      }
      return jsonResponse({ error: "Inicia sesión para ver tus incidencias." }, 401);
    }

    let filterOptions = standardIssueFilters;
    if (query.filters.some((filter) => filter.field.startsWith("cf_"))) {
      try {
        filterOptions = await getRedmineIssueFilterOptions(session.apiKey);
      } catch (error) {
        if (error instanceof RedmineRequestError && error.failure === "forbidden")
          return jsonResponse(
            { error: "Los campos personalizados no están disponibles para tu cuenta." },
            400,
          );
        throw error;
      }
    }
    if (!validateIssueFilters(query.filters, filterOptions))
      return jsonResponse(
        { error: "Uno o más filtros no son válidos o ya no están disponibles." },
        400,
      );
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
          return jsonResponse(
            { error: "La API Key dejó de tener acceso. Inicia sesión de nuevo." },
            401,
          );
        case "forbidden":
          return jsonResponse({ error: "Redmine no permite ver estas incidencias." }, 403);
        case "unavailable":
          return jsonResponse(
            { error: "No se pudo conectar con Redmine. Inténtalo de nuevo." },
            503,
          );
        case "unexpected":
          return jsonResponse({ error: "Redmine devolvió una respuesta inesperada." }, 502);
      }
    }

    return jsonResponse({ error: "No se pudieron cargar las incidencias." }, 500);
  }
}
