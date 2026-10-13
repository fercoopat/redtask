"use client";

import { useTranslations } from "next-intl";
import { useFormState } from "react-hook-form";

import type { IssueCreateFormState } from "@/modules/issues/hooks/use-issue-create-form";
import type { IssueCreateOptions } from "@/modules/issues/schemas/issue-creation";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export function IssueCreateDetailFields({
  form,
  options,
}: {
  form: IssueCreateFormState;
  options?: IssueCreateOptions;
}) {
  "use no memo";

  // React Hook Form resets mutate registration state without changing the form object.
  const t = useTranslations();
  const { errors } = useFormState({ control: form.control });
  const subjectError = errors.subject
    ? errors.subject.type === "too_big"
      ? t("subjectTooLong")
      : t("requiredField")
    : undefined;
  const descriptionError = errors.description ? t("descriptionTooLong") : undefined;

  return (
    <>
      <FormField label={t("subject")} htmlFor="issue-subject" error={subjectError}>
        <Input
          id="issue-subject"
          aria-invalid={Boolean(subjectError)}
          aria-describedby={subjectError ? "issue-subject-error" : undefined}
          className={subjectError ? "input-error" : ""}
          maxLength={255}
          required
          {...form.register("subject")}
        />
      </FormField>
      <FormField label={t("description")} htmlFor="issue-description" error={descriptionError}>
        <Textarea
          id="issue-description"
          aria-invalid={Boolean(descriptionError)}
          aria-describedby={descriptionError ? "issue-description-error" : undefined}
          className={`min-h-28 ${descriptionError ? "textarea-error" : ""}`}
          {...form.register("description")}
        />
      </FormField>
      {options?.priorities.length ? (
        <FormField
          label={t("priority")}
          htmlFor="issue-priority"
          error={errors.priorityId ? t("invalidIssueDraft") : undefined}
        >
          <Select
            id="issue-priority"
            aria-invalid={Boolean(errors.priorityId)}
            aria-describedby={errors.priorityId ? "issue-priority-error" : undefined}
            className={errors.priorityId ? "select-error" : ""}
            {...form.register("priorityId", {
              setValueAs: (value) => (value ? Number(value) : undefined),
            })}
          >
            <option value="">{t("selectOptional")}</option>
            {options.priorities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {options?.categories.length ? (
        <FormField
          label={t("category")}
          htmlFor="issue-category"
          error={errors.categoryId ? t("invalidIssueDraft") : undefined}
        >
          <Select
            id="issue-category"
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? "issue-category-error" : undefined}
            className={errors.categoryId ? "select-error" : ""}
            {...form.register("categoryId", {
              setValueAs: (value) => (value ? Number(value) : undefined),
            })}
          >
            <option value="">{t("selectOptional")}</option>
            {options.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {options?.customFields.map((field) => {
        const valueError = errors.customFieldValues?.[String(field.id)];
        const fieldId = `issue-custom-field-${field.id}`;
        return (
          <FormField
            key={field.id}
            label={`${field.name}${field.required ? " *" : ""}`}
            htmlFor={fieldId}
            error={valueError ? t("invalidIssueDraft") : undefined}
          >
            {field.possibleValues?.length ? (
              <Select
                id={fieldId}
                aria-invalid={Boolean(valueError)}
                aria-describedby={valueError ? `${fieldId}-error` : undefined}
                className={valueError ? "select-error" : ""}
                required={field.required}
                {...form.register(`customFieldValues.${field.id}`)}
              >
                <option value="">{t("selectOptional")}</option>
                {field.possibleValues.map((value) => (
                  <option key={value.value} value={value.value}>
                    {value.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={fieldId}
                aria-invalid={Boolean(valueError)}
                aria-describedby={valueError ? `${fieldId}-error` : undefined}
                className={valueError ? "input-error" : ""}
                required={field.required}
                {...form.register(`customFieldValues.${field.id}`)}
              />
            )}
          </FormField>
        );
      })}
    </>
  );
}
