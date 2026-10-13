"use client";

import { useTranslations } from "next-intl";
import { useFormState } from "react-hook-form";

import type { IssueCreateFormState } from "@/modules/issues/hooks/use-issue-create-form";
import type { IssueCreateOptions, ProjectChoice } from "@/modules/issues/schemas/issue-creation";
import { FormField } from "@/shared/ui/form-field";
import { Select } from "@/shared/ui/select";

export function IssueCreateProjectFields({
  form,
  projects,
  options,
  onProjectChange,
}: {
  form: IssueCreateFormState;
  projects: ProjectChoice[];
  options?: IssueCreateOptions;
  onProjectChange: (id: number) => void;
}) {
  "use no memo";

  // React Hook Form resets mutate registration state without changing the form object.
  const t = useTranslations();
  const { errors } = useFormState({ control: form.control });
  const projectError = errors.projectId ? t("selectProject") : undefined;
  const trackerError = errors.trackerId ? t("selectTracker") : undefined;
  return (
    <>
      <FormField label={t("project")} htmlFor="issue-project" error={projectError}>
        <Select
          id="issue-project"
          aria-invalid={Boolean(projectError)}
          aria-describedby={projectError ? "issue-project-error" : undefined}
          className={projectError ? "select-error" : ""}
          {...form.register("projectId", { valueAsNumber: true })}
          onChange={(event) => onProjectChange(Number(event.target.value))}
          required
        >
          <option value="">{t("selectProject")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </FormField>
      {options?.trackers.length ? (
        <FormField label={t("tracker")} htmlFor="issue-tracker" error={trackerError}>
          <Select
            id="issue-tracker"
            aria-invalid={Boolean(trackerError)}
            aria-describedby={trackerError ? "issue-tracker-error" : undefined}
            className={trackerError ? "select-error" : ""}
            required
            {...form.register("trackerId", {
              setValueAs: (value) => (value ? Number(value) : undefined),
            })}
          >
            <option value="">{t("selectTracker")}</option>
            {options.trackers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
    </>
  );
}
