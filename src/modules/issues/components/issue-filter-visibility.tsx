"use client";
import { useTranslations } from "next-intl";

import type { IssueFilterOption } from "@/modules/issues/helpers/issue-filter-options";
export function IssueFilterVisibility({
  fields,
  visibleFields,
  onChange,
}: {
  fields: IssueFilterOption[];
  visibleFields: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations();
  return (
    <details className="border-t border-base-300 pt-3">
      <summary className="cursor-pointer font-medium">{t("customizeFields")}</summary>
      <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <legend className="sr-only">{t("visibleFilterFields")}</legend>
        {fields.map((field) => (
          <label key={field.field} className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={visibleFields.includes(field.field)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...new Set([...visibleFields, field.field])]
                    : visibleFields.filter((item) => item !== field.field),
                )
              }
            />
            <span>{field.label}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
