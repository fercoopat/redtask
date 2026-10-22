"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { parseTheme, type Theme, themes } from "@/shared/schemas/theme";
import { Select } from "@/shared/ui/select";

function subscribe(onChange: () => void) {
  window.addEventListener("workspace-theme-change", onChange);
  return () => window.removeEventListener("workspace-theme-change", onChange);
}
function currentTheme() {
  return parseTheme(document.documentElement.dataset.theme);
}

export function ThemeSwitcher({ initialTheme }: { initialTheme: Theme }) {
  const t = useTranslations("workspaceUi");
  const theme = useSyncExternalStore(subscribe, currentTheme, () => initialTheme);
  return (
    <label className="grid gap-1 text-sm">
      <span>{t("theme")}</span>
      <Select
        aria-label={t("theme")}
        value={theme}
        onChange={(event) => {
          const next = parseTheme(event.target.value);
          document.documentElement.dataset.theme = next;
          document.cookie = `workspace-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
          window.dispatchEvent(new Event("workspace-theme-change"));
        }}
      >
        {themes.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
    </label>
  );
}
