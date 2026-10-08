import { cookies } from "next/headers";
import { z } from "zod";

import { isSameOriginRequest, jsonResponse } from "@/shared/http";
import { locales } from "@/shared/i18n/locale";

const localeSchema = z.object({ locale: z.enum(locales) });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: "Request not allowed." }, 403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json")
    return jsonResponse({ error: "Invalid request format." }, 415);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request format." }, 400);
  }
  const parsed = localeSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "Invalid locale." }, 400);

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
