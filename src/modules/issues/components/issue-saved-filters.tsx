"use client";
import { useTranslations } from "next-intl";

import {
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
}: {
  controller: ReturnType<typeof useIssueFilterForm>;
  fields: IssueFilterOption[];
  filters: IssueFilterCriterion[];
  savedFilters: SavedIssueFilter[];
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
      <div className="min-w-52">
        <FormField htmlFor="saved-filter" label={t("savedFilters")}>
          <Select
            id="saved-filter"
            className="select-sm"
            value={selectedSavedId}
            onChange={(event) => setSelectedSavedId(event.target.value)}
          >
            <option value="">{t("selectFilter")}</option>
            {savedFilters.map((saved) => (
              <option key={saved.id} value={saved.id}>
                {saved.name}
                {validateIssueFilters(saved.filters, fields) ? "" : ` ${t("needsReview")}`}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={!selectedSaved || !validateIssueFilters(selectedSaved.filters, fields)}
        onClick={applySelectedSaved}
      >
        {t("apply")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={!selectedSaved}
        onClick={editSelectedSaved}
      >
        {t("editCriteria")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm"
        disabled={!selectedSaved || !validateIssueFilters(filters, fields)}
        onClick={updateSaved}
      >
        {t("update")}
      </Button>
      <Button
        type="button"
        className="btn btn-sm btn-error btn-outline"
        disabled={!selectedSaved}
        onClick={removeSaved}
      >
        {t("delete")}
      </Button>
      <div className="min-w-48 flex-1">
        <FormField htmlFor="filter-name" label={t("filterName")} error={nameError}>
          <Input
            id="filter-name"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "filter-name-error" : undefined}
            className="input-sm"
            maxLength={100}
            value={filterName}
            onChange={(event) => setFilterName(event.target.value)}
          />
        </FormField>
      </div>
      <Button
        type="button"
        className="btn btn-sm"
        onClick={selectedSaved ? renameSaved : saveCurrentFilter}
      >
        {selectedSaved ? t("rename") : t("saveFilter")}
      </Button>
    </div>
  );
}
