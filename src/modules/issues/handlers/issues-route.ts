import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { getRedmineIssues, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { jsonResponse } from "@/shared/http";

export async function GET() {
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

    const page = await getRedmineIssues(session.apiKey);
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
