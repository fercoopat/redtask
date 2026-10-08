import { getTranslations } from "next-intl/server";

import { getRedmineCurrentUser, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { isSameOriginRequest, jsonResponse, NO_STORE_HEADERS } from "@/shared/http";

import { sessionRequestSchema } from "../helpers/schemas";
import { clearSession, createSession } from "../helpers/session";

export async function POST(request: Request) {
  const t = await getTranslations();
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: t("requestNotAllowed") }, 403);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse({ error: t("invalidRequestFormat") }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: t("invalidRequestFormat") }, 400);
  }

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: t("invalidApiKey") }, 400);
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
              error: t("invalidApiKeyAccess"),
            },
            401,
          );
        case "forbidden":
          return jsonResponse(
            {
              error: t("restForbidden"),
            },
            403,
          );
        case "unavailable":
          return jsonResponse({ error: t("redmineUnavailable") }, 503);
        case "unexpected":
          return jsonResponse({ error: t("unexpectedRedmine") }, 502);
      }
    }

    return jsonResponse({ error: t("loginError") }, 500);
  }
}

export async function DELETE(request: Request) {
  const t = await getTranslations();
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: t("requestNotAllowed") }, 403);
  }

  try {
    await clearSession();
    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch {
    return jsonResponse({ error: t("logoutFailed") }, 500);
  }
}
