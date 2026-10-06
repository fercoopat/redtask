import { getRedmineCurrentUser, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { isSameOriginRequest, jsonResponse, NO_STORE_HEADERS } from "@/shared/http";

import { sessionRequestSchema } from "../helpers/schemas";
import { clearSession, createSession } from "../helpers/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: "Solicitud no permitida." }, 403);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse({ error: "El formato de la solicitud no es válido." }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "El formato de la solicitud no es válido." }, 400);
  }

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Ingresa una API Key válida." }, 400);
  }

  try {
    const user = await getRedmineCurrentUser(parsed.data.apiKey);
    await createSession(parsed.data.apiKey, user);
    return jsonResponse({ user });
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      switch (error.failure) {
        case "unauthorized":
          return jsonResponse(
            {
              error:
                "La API Key no es válida o el acceso REST está deshabilitado. Verifica la clave o consulta al administrador.",
            },
            401,
          );
        case "forbidden":
          return jsonResponse(
            {
              error:
                "Redmine no permite el acceso REST. Consulta al administrador de la instancia.",
            },
            403,
          );
        case "unavailable":
          return jsonResponse(
            { error: "No se pudo conectar con Redmine. Inténtalo de nuevo." },
            503,
          );
        case "unexpected":
          return jsonResponse({ error: "Redmine devolvió una respuesta inesperada." }, 502);
      }
    }

    return jsonResponse({ error: "No se pudo iniciar sesión. Inténtalo de nuevo." }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: "Solicitud no permitida." }, 403);
  }

  try {
    await clearSession();
    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch {
    return jsonResponse({ error: "No se pudo cerrar la sesión. Inténtalo de nuevo." }, 500);
  }
}
