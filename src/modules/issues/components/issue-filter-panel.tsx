"use client";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { useFormState } from "react-hook-form";

import {
  formatIssueFilterCriterion,
  type IssueFilterCriterion,
  type IssueFilterOption,
} from "@/modules/issues/helpers/issue-filter-options";
import { useIssueFilterForm } from "@/modules/issues/hooks/use-issue-filter-form";
import { useLocalizedIssueFilters } from "@/modules/issues/hooks/use-localized-issue-filters";
import type { IssueListPreferences } from "@/modules/issues/schemas/issue-preferences";
import { Button } from "@/shared/ui/button";
import { Card, CardBody } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

import { IssueFilterVisibility } from "./issue-filter-visibility";
import { IssueSavedFilters } from "./issue-saved-filters";

export function IssueFilterPanel({
  availableFields,
  filters,
  onChangeFilters,
  preferences,
  setPreferences,
  disabled = false,
}: {
  availableFields: IssueFilterOption[];
  filters: IssueFilterCriterion[];
  onChangeFilters: (next: IssueFilterCriterion[]) => void;
  preferences: IssueListPreferences;
  setPreferences: Dispatch<SetStateAction<IssueListPreferences>>;
  disabled?: boolean;
}) {
  "use no memo";

  // Register must run again after React Hook Form resets the draft.
  const t = useTranslations();
  const fields = useLocalizedIssueFilters(availableFields);
  const controller = useIssueFilterForm({
    fields,
    filters,
    onChangeFilters,
    savedFilters: preferences.savedFilters,
    onSavedFiltersChange: (savedFilters) =>
      setPreferences((current) => ({ ...current, savedFilters })),
  });
  const {
    draftForm,
    draftField,
    draftOperator,
    chosenField,
    chosenOperator,
    submitDraft,
    editIndex,
    editFilter,
    changeFilters,
  } = controller;
  const errorMessage = (message?: string) =>
    message === "invalidFilterField"
      ? t("invalidFilterField")
      : message === "invalidFilterOperator"
        ? t("invalidFilterOperator")
        : message === "duplicateFilter"
          ? t("duplicateFilter")
          : message === "filterValueRequired"
            ? t("filterValueRequired")
            : message
              ? t("invalidFilterValue")
              : undefined;
  const { errors } = useFormState({ control: draftForm.control });
  const fieldError = errorMessage(errors.field?.message);
  const operatorError = errorMessage(errors.operator?.message);
  const valueError = errorMessage(errors.value?.message);
  return (
    <Card className="border border-base-300 bg-base-100 shadow-sm">
      <CardBody className="space-y-5">
        <form
          noValidate
          onSubmit={submitDraft}
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
          aria-label={t("addIssueFilter")}
          aria-busy={disabled}
        >
          <fieldset className="contents" disabled={disabled}>
            <FormField htmlFor="filter-field" label={t("field")} error={fieldError}>
              <Select
                id="filter-field"
                value={draftField}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "filter-field-error" : undefined}
                {...draftForm.register("field")}
                onChange={(event) => {
                  const field = fields.find((item) => item.field === event.target.value);
                  draftForm.setValue("field", event.target.value);
                  draftForm.setValue("operator", field?.operators[0]?.value ?? "=");
                  draftForm.setValue("value", "");
                }}
              >
                <optgroup label={t("visibleFields")}>
                  {fields
                    .filter((field) => preferences.visibleFields.includes(field.field))
                    .map((field) => (
                      <option key={field.field} value={field.field}>
                        {field.label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label={t("allFields")}>
                  {fields
                    .filter((field) => !preferences.visibleFields.includes(field.field))
                    .map((field) => (
                      <option key={field.field} value={field.field}>
                        {field.label}
                      </option>
                    ))}
                </optgroup>
              </Select>
            </FormField>
            <FormField htmlFor="filter-operator" label={t("condition")} error={operatorError}>
              <Select
                id="filter-operator"
                value={draftOperator}
                aria-invalid={Boolean(operatorError)}
                aria-describedby={operatorError ? "filter-operator-error" : undefined}
                {...draftForm.register("operator")}
                onChange={(event) => {
                  draftForm.setValue("operator", event.target.value);
                  draftForm.setValue("value", "");
                  draftForm.clearErrors("value");
                }}
              >
                {draftOperator && !chosenOperator && (
                  <option value={draftOperator}>
                    {draftOperator} {t("needsReview")}
                  </option>
                )}
                {chosenField?.operators.map((operator) => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {chosenOperator?.requiresValue ? (
              <FormField htmlFor="filter-value" label={t("value")} error={valueError}>
                {chosenField?.values?.length ? (
                  <Select
                    id="filter-value"
                    aria-invalid={Boolean(valueError)}
                    aria-describedby={valueError ? "filter-value-error" : undefined}
                    {...draftForm.register("value")}
                  >
                    <option value="">{t("selectValue")}</option>
                    {chosenField.values.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : chosenField?.type === "list" && !chosenField.allowTypedId ? (
                  <p className="text-sm text-warning" role="status">
                    {t("filterOptionsUnavailable")}
                  </p>
                ) : (
                  <>
                    <Input
                      type={
                        chosenField?.type === "date"
                          ? "date"
                          : chosenField?.type === "number" || chosenField?.type === "list"
                            ? "number"
                            : "text"
                      }
                      id="filter-value"
                      min={chosenField?.allowTypedId ? 1 : undefined}
                      step={chosenField?.allowTypedId ? 1 : "any"}
                      inputMode={chosenField?.allowTypedId ? "numeric" : undefined}
                      aria-invalid={Boolean(valueError)}
                      aria-describedby={
                        [
                          valueError ? "filter-value-error" : undefined,
                          chosenField?.allowTypedId ? "filter-value-id-help" : undefined,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      {...draftForm.register("value")}
                    />
                    {chosenField?.allowTypedId && (
                      <p id="filter-value-id-help" className="mt-1 text-sm text-base-content/70">
                        {t("filterListIdOnly")}
                      </p>
                    )}
                  </>
                )}
              </FormField>
            ) : (
              <div className="self-end pb-3 text-sm text-base-content/60">
                {t("noValueRequired")}
              </div>
            )}
            <Button
              className="btn btn-primary self-end"
              type="submit"
              disabled={
                disabled ||
                (editIndex === null && filters.length >= 20) ||
                (Boolean(chosenOperator?.requiresValue) &&
                  chosenField?.type === "list" &&
                  !chosenField.values?.length &&
                  !chosenField.allowTypedId)
              }
            >
              {editIndex === null ? t("add") : t("saveChange")}
            </Button>
          </fieldset>
        </form>
        <div className="flex flex-wrap gap-2" aria-label={t("activeFilters")}>
          {filters.map((filter, index) => {
            const field = fields.find((option) => option.field === filter.field);
            return (
              <div
                key={`${filter.field}-${index}`}
                className="badge badge-outline h-auto gap-2 py-2"
              >
                {formatIssueFilterCriterion(filter, fields)}
                <Button
                  type="button"
                  aria-label={t("editFilter", { field: field?.label ?? filter.field })}
                  disabled={disabled}
                  onClick={() => editFilter(index)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  aria-label={t("removeFilter", { field: field?.label ?? filter.field })}
                  disabled={disabled}
                  onClick={() => changeFilters(filters.filter((_, i) => i !== index))}
                >
                  ×
                </Button>
              </div>
            );
          })}
          {filters.length > 0 && (
            <Button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={disabled}
              onClick={() => {
                changeFilters([]);
              }}
            >
              {t("clearAll")}
            </Button>
          )}
        </div>
        <IssueSavedFilters
          controller={controller}
          fields={fields}
          filters={filters}
          savedFilters={preferences.savedFilters}
          disabled={disabled}
        />
        <IssueFilterVisibility
          fields={fields}
          visibleFields={preferences.visibleFields}
          disabled={disabled}
          onChange={(visibleFields) => setPreferences((current) => ({ ...current, visibleFields }))}
        />
      </CardBody>
    </Card>
  );
}
