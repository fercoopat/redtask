import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/shared/i18n/locale";
import { messages } from "@/shared/i18n/translations";

export default getRequestConfig(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get("locale")?.value,
    requestHeaders.get("accept-language"),
  );
  return { locale, messages: messages[locale] };
});
