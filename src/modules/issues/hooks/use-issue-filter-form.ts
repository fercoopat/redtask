"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import type {
  IssueFilterCriterion,
  IssueFilterOption,
} from "@/modules/issues/helpers/issue-filter-options";
import { validateIssueFilters } from "@/modules/issues/helpers/issue-filter-options";
import type { SavedIssueFilter } from "@/modules/issues/helpers/issue-list-preferences";
import { createIssueFilterSchema } from "@/modules/issues/schemas/issue-filters";

export function useIssueFilterForm({
  fields,
  filters,
  onChangeFilters,
  savedFilters,
  onSavedFiltersChange,
}: {
  fields: IssueFilterOption[];
  filters: IssueFilterCriterion[];
  onChangeFilters: (filters: IssueFilterCriterion[]) => void;
  savedFilters: SavedIssueFilter[];
  onSavedFiltersChange: (filters: SavedIssueFilter[]) => void;
}) {
  const t = useTranslations();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [filterName, setFilterName] = useState("");
  const [nameError, setNameError] = useState("");
  const draftSchema = createIssueFilterSchema(fields);
  const draftForm = useForm<z.infer<typeof draftSchema>>({
    resolver: zodResolver(draftSchema),
    defaultValues: { field: "status_id", operator: "=", value: "" },
  });
  const draftField = useWatch({ control: draftForm.control, name: "field" });
  const draftOperator = useWatch({ control: draftForm.control, name: "operator" });
  const chosenField = fields.find((field) => field.field === draftField);
  const chosenOperator = chosenField?.operators.find(
    (operator) => operator.value === draftOperator,
  );
  const selectedSaved = savedFilters.find((saved) => saved.id === selectedSavedId);

  const changeFilters = (next: IssueFilterCriterion[]) => {
    onChangeFilters(next);
    setEditIndex(null);
  };

  const submitDraft = draftForm.handleSubmit((draft) => {
    if (!chosenField) return;
    if (filters.some((filter, index) => filter.field === draft.field && index !== editIndex)) {
      draftForm.setError("field", { message: "duplicateFilter" });
      return;
    }
    const criterion = {
      field: draft.field,
      operator: draft.operator,
      ...(chosenOperator?.requiresValue ? { value: (draft.value ?? "").trim() } : {}),
    };
    const next = [...filters];
    if (editIndex === null) next.push(criterion);
    else next[editIndex] = criterion;
    changeFilters(next);
    draftForm.reset({
      field: chosenField.field,
      operator: chosenField.operators[0]?.value ?? "=",
      value: "",
    });
  });

  const editFilter = (index: number) => {
    const filter = filters[index];
    setEditIndex(index);
    draftForm.reset({ field: filter.field, operator: filter.operator, value: filter.value ?? "" });
  };

  const saveCurrentFilter = () => {
    if (!validateIssueFilters(filters, fields)) return;
    const name = filterName.trim();
    if (!name) {
      setNameError(t("saveFilterNameRequired"));
      return;
    }
    const saved = { id: crypto.randomUUID(), name, filters: [...filters] };
    onSavedFiltersChange([...savedFilters, saved]);
    setSelectedSavedId(saved.id);
    setFilterName("");
    setNameError("");
  };

  const applySelectedSaved = () => {
    if (selectedSaved && validateIssueFilters(selectedSaved.filters, fields))
      changeFilters(selectedSaved.filters);
  };

  const renameSaved = () => {
    const name = filterName.trim();
    if (!selectedSaved || !name) {
      setNameError(t("renameFilterNameRequired"));
      return;
    }
    onSavedFiltersChange(
      savedFilters.map((saved) => (saved.id === selectedSaved.id ? { ...saved, name } : saved)),
    );
    setFilterName("");
    setNameError("");
  };

  const updateSaved = () => {
    if (!selectedSaved || !validateIssueFilters(filters, fields)) return;
    onSavedFiltersChange(
      savedFilters.map((saved) =>
        saved.id === selectedSaved.id ? { ...saved, filters: [...filters] } : saved,
      ),
    );
  };

  const removeSaved = () => {
    if (!selectedSaved) return;
    onSavedFiltersChange(savedFilters.filter((saved) => saved.id !== selectedSaved.id));
    setSelectedSavedId("");
  };

  return {
    draftForm,
    draftField,
    draftOperator,
    chosenField,
    chosenOperator,
    submitDraft,
    editIndex,
    editFilter,
    changeFilters,
    selectedSavedId,
    setSelectedSavedId,
    selectedSaved,
    filterName,
    setFilterName,
    nameError,
    saveCurrentFilter,
    applySelectedSaved,
    editSelectedSaved: () => {
      if (selectedSaved) changeFilters(selectedSaved.filters);
    },
    renameSaved,
    updateSaved,
    removeSaved,
  };
}
