"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { isLocale, type Locale, locales } from "./locale";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [retryLocale, setRetryLocale] = useState<Locale | null>(null);

  const saveLocale = async (nextLocale: Locale) => {
    setRetryLocale(nextLocale);
    setStatus("pending");
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error();
      setStatus("success");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor="locale" className="sr-only">
        {t("language")}
      </label>
      <select
        id="locale"
        className="select select-bordered select-sm"
        value={locale}
        disabled={status === "pending"}
        onChange={(event) => {
          if (isLocale(event.target.value)) void saveLocale(event.target.value);
        }}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {item === "es" ? "Español" : "English"}
          </option>
        ))}
      </select>
      {status === "pending" && <p role="status">{t("languageSaving")}</p>}
      {status === "success" && <p role="status">{t("languageSaved")}</p>}
      {status === "error" && (
        <p role="alert" className="flex items-center gap-2 text-sm text-error">
          {t("languageSaveError")}
          {retryLocale && (
            <button
              type="button"
              className="btn btn-xs"
              onClick={() => void saveLocale(retryLocale)}
            >
              {t("retry")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
