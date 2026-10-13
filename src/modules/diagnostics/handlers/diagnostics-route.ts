import { clearSession, getAuthenticatedSession } from "@/modules/auth/helpers/session";
import { RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { jsonResponse } from "@/shared/http";

import { runDiagnostics } from "../helpers/run-diagnostics";
import { diagnosticQuerySchema } from "../schemas/diagnostics";

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return apiErrorResponse("session_required", 401);
    const params = new URL(request.url).searchParams;
    const query = diagnosticQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success || params.getAll("projectId").length !== 1)
      return apiErrorResponse("invalid_diagnostics_query", 400);
    return jsonResponse(await runDiagnostics(session.apiKey, session.userId, query.data.projectId));
  } catch (error) {
    if (error instanceof RedmineRequestError && error.failure === "unauthorized") {
      try {
        await clearSession();
      } catch {
        /* Deny access even if cleanup fails. */
      }
      return apiErrorResponse("api_key_revoked", 401);
    }
    return apiErrorResponse("diagnostics_failed", 500);
  }
}
