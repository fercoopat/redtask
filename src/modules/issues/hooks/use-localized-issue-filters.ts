"use client";
import { useTranslations } from "next-intl";

import type { IssueFilterOption } from "@/modules/issues/helpers/issue-filter-options";

export function useLocalizedIssueFilters(availableFields: IssueFilterOption[]) {
  const t = useTranslations();
  const fieldLabels: Record<string, string> = {
    status_id: t("filterFields.status_id"),
    tracker_id: t("filterFields.tracker_id"),
    priority_id: t("filterFields.priority_id"),
    project_id: t("filterFields.project_id"),
    author_id: t("filterFields.author_id"),
    assigned_to_id: t("filterFields.assigned_to_id"),
    category_id: t("filterFields.category_id"),
    fixed_version_id: t("filterFields.fixed_version_id"),
    parent_id: t("filterFields.parent_id"),
    watcher_id: t("filterFields.watcher_id"),
    subject: t("filterFields.subject"),
    description: t("filterFields.description"),
    created_on: t("filterFields.created_on"),
    updated_on: t("filterFields.updated_on"),
    closed_on: t("filterFields.closed_on"),
    start_date: t("filterFields.start_date"),
    due_date: t("filterFields.due_date"),
    done_ratio: t("filterFields.done_ratio"),
    estimated_hours: t("filterFields.estimated_hours"),
    is_private: t("filterFields.is_private"),
  };
  const operatorLabels: Record<string, string> = {
    "=": t("filterOperators.equal"),
    "!": t("filterOperators.notEqual"),
    "~": t("filterOperators.contains"),
    "!~": t("filterOperators.notContains"),
    ">=": t("filterOperators.from"),
    "<=": t("filterOperators.through"),
    ">": t("filterOperators.greaterThan"),
    "<": t("filterOperators.lessThan"),
  };
  const specialOperatorLabels: Record<string, string> = {
    "status_id:o": t("filterOperators.open"),
    "status_id:c": t("filterOperators.closed"),
    "status_id:*": t("filterOperators.any"),
    "subject:*": t("filterOperators.notEmpty"),
    "subject:!*": t("filterOperators.empty"),
  };
  return availableFields.map((field) => ({
    ...field,
    label: fieldLabels[field.field] ?? field.label,
    operators: field.operators.map((operator) => ({
      ...operator,
      label:
        specialOperatorLabels[`${field.field}:${operator.value}`] ??
        (field.type === "number" && operator.value === ">="
          ? t("filterOperators.greaterOrEqual")
          : field.type === "number" && operator.value === "<="
            ? t("filterOperators.lessOrEqual")
            : operatorLabels[operator.value]) ??
        operator.label,
    })),
    values:
      field.field === "is_private"
        ? field.values?.map((item) => ({ ...item, label: item.value === "1" ? t("yes") : t("no") }))
        : field.values,
  }));
}
