"use client";
import { useTranslations } from "next-intl";

import {
  formatIssueFilterCriterion,
  type IssueFilterCriterion,
  type IssueFilterOption,
  validateIssueFilters,
} from "@/modules/issues/helpers/issue-filter-options";
import type { useIssueFilterForm } from "@/modules/issues/hooks/use-issue-filter-form";
import type { SavedIssueFilter } from "@/modules/issues/schemas/issue-preferences";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

export function IssueSavedFilters({
  controller,
  fields,
  filters,
  savedFilters,
  disabled = false,
}: {
  controller: ReturnType<typeof useIssueFilterForm>;
  fields: IssueFilterOption[];
  filters: IssueFilterCriterion[];
  savedFilters: SavedIssueFilter[];
  disabled?: boolean;
}) {
  const t = useTranslations();
  const {
    selectedSavedId,
    setSelectedSavedId,
    selectedSaved,
    filterName,
    setFilterName,
    nameError,
    saveCurrentFilter,
    applySelectedSaved,
    editSelectedSaved,
    renameSaved,
    updateSaved,
    removeSaved,
  } = controller;
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-base-300 pt-4">
      <div className="min-w-0 basis-full xl:basis-72">
        <FormField htmlFor="saved-filter" label={t("savedFilters")}>
          <Select
            id="saved-filter"
            className="select-sm"
            value={selectedSavedId}
            disabled={disabled}
            onChange={(event) => setSelectedSavedId(event.target.value)}
          >
            <option value="">{t("selectFilter")}</option>
            {savedFilters.map((saved) => (
              <option key={saved.id} value={saved.id}>
                {saved.name} —{" "}
                {saved.filters
                  .map((filter) => formatIssueFilterCriterion(filter, fields))
                  .join(", ")}
                {validateIssueFilters(saved.filters, fields) ? "" : ` ${t("needsReview")}`}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={
          disabled || !selectedSaved || !validateIssueFilters(selectedSaved.filters, fields)
        }
        onClick={applySelectedSaved}
      >
        {t("apply")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={disabled || !selectedSaved}
        onClick={editSelectedSaved}
      >
        {t("editCriteria")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={disabled || !selectedSaved || !validateIssueFilters(filters, fields)}
        onClick={updateSaved}
      >
        {t("update")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm btn-error btn-outline"
        disabled={disabled || !selectedSaved}
        onClick={removeSaved}
      >
        {t("delete")}
      </Button>
      <div className="min-w-0 basis-full xl:basis-48 xl:flex-1">
        <FormField htmlFor="filter-name" label={t("filterName")} error={nameError}>
          <Input
            id="filter-name"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "filter-name-error" : undefined}
            className="input-sm"
            maxLength={100}
            value={filterName}
            disabled={disabled}
            onChange={(event) => setFilterName(event.target.value)}
          />
        </FormField>
      </div>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={disabled}
        onClick={selectedSaved ? renameSaved : saveCurrentFilter}
      >
        {selectedSaved ? t("rename") : t("saveFilter")}
      </Button>
    </div>
  );
}
