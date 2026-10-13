import { cookies } from "next/headers";

import { apiErrorResponse } from "@/shared/errors/api-error";
import { isSameOriginRequest, jsonResponse } from "@/shared/http";
import { localeSchema } from "@/shared/schemas/locale";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiErrorResponse("request_not_allowed", 403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json")
    return apiErrorResponse("invalid_request_format", 415);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("invalid_request_format", 400);
  }
  const parsed = localeSchema.safeParse(body);
  if (!parsed.success) return apiErrorResponse("invalid_locale", 400);

  const secure = new URL(request.url).protocol === "https:";
  (await cookies()).set("locale", parsed.data.locale, {
    maxAge: 31_536_000,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
  return jsonResponse({ locale: parsed.data.locale });
}
