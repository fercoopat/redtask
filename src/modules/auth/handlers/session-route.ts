import { sessionRequestSchema } from "@/modules/auth/schemas/session";
import { getRedmineCurrentUser, RedmineRequestError } from "@/modules/redmine/helpers/redmine-api";
import { apiErrorResponse } from "@/shared/errors/api-error";
import { isSameOriginRequest, jsonResponse, NO_STORE_HEADERS } from "@/shared/http";

import { clearSession, createSession } from "../helpers/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return apiErrorResponse("request_not_allowed", 403);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return apiErrorResponse("invalid_request_format", 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("invalid_request_format", 400);
  }

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse("invalid_api_key", 400);
  }

  try {
    const user = await getRedmineCurrentUser(parsed.data.apiKey);
    await createSession(parsed.data.apiKey, user);
    return jsonResponse({ user });
  } catch (error) {
    if (error instanceof RedmineRequestError) {
      switch (error.failure) {
        case "unauthorized":
          return apiErrorResponse("invalid_credentials", 401);
        case "forbidden":
          return apiErrorResponse("rest_forbidden", 403);
        case "unavailable":
          return apiErrorResponse("redmine_unavailable", 503);
        case "unexpected":
          return apiErrorResponse("redmine_unexpected", 502);
      }
    }

    return apiErrorResponse("login_failed", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return apiErrorResponse("request_not_allowed", 403);
  }

  try {
    await clearSession();
    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch {
    return apiErrorResponse("logout_failed", 500);
  }
}
