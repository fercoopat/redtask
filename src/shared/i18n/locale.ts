export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}

export function resolveLocale(
  preference: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(preference)) return preference;

  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return { locale: tag.toLowerCase().split("-")[0], quality, index };
    })
    .filter(({ locale, quality }) => isLocale(locale) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  return isLocale(candidates[0]?.locale) ? candidates[0].locale : "es";
}

export function resolveRequestLocale(request: Request): Locale {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("=", 2))
    .find(([name]) => name === "locale");
  return resolveLocale(cookie?.[1], request.headers.get("accept-language"));
}
