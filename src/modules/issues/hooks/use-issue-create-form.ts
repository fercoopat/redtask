"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturn, useWatch } from "react-hook-form";

import { useSessionLifecycle } from "@/modules/auth/hooks/use-session-lifecycle";
import { useCreateIssue } from "@/modules/issues/hooks/use-create-issue";
import { useIssueCreateOptions } from "@/modules/issues/hooks/use-issue-create-options";
import {
  createIssueFormSchema,
  type IssueCreateFormInput,
} from "@/modules/issues/schemas/issue-create-form";
import type { CreatedIssue, IssueDraftOutput } from "@/modules/issues/schemas/issue-creation";
import { AppApiError } from "@/shared/errors/api-error";

export type IssueCreateFormState = UseFormReturn<IssueCreateFormInput, unknown, IssueDraftOutput>;
const defaultValues = { projectId: 0, subject: "", description: "", customFieldValues: {} };

export function useIssueCreateForm(open: boolean, onCreated: (issue: CreatedIssue) => void) {
  const { endSession } = useSessionLifecycle();
  const pending = useRef(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [verified, setVerified] = useState(false);
  const [projectId, setProjectId] = useState(0);
  const queries = useIssueCreateOptions(projectId, open || ambiguous);
  const form = useForm<IssueCreateFormInput, unknown, IssueDraftOutput>({
    resolver: zodResolver(createIssueFormSchema(queries.options)),
    defaultValues,
  });
  const currentProject = useWatch({ control: form.control, name: "projectId" });
  const mutation = useCreateIssue();
  const canSubmit =
    currentProject === projectId &&
    queries.options?.projectId === projectId &&
    !queries.optionsError &&
    !queries.isLoading;
  useEffect(() => {
    const priority = form.getValues("priorityId");
    if (
      queries.options?.projectId === projectId &&
      priority !== undefined &&
      !queries.options.priorities.some((item) => item.id === priority)
    )
      form.setValue("priorityId", undefined);
  }, [queries.options, projectId, form]);
  const reset = () => {
    form.reset(defaultValues);
    setProjectId(0);
    mutation.reset();
  };
  const changeProject = (id: number) => {
    if (pending.current || ambiguous) return;
    const { subject, description, priorityId } = form.getValues();
    form.reset({ ...defaultValues, subject, description, priorityId, projectId: id });
    setProjectId(id);
    mutation.reset();
  };
  const submit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (draft) => {
      if (pending.current || !canSubmit || (ambiguous && !verified)) return;
      pending.current = true;
      setAmbiguous(false);
      try {
        const result = await mutation.createIssue(draft);
        reset();
        onCreated(result.issue);
      } catch (error) {
        const status = error instanceof AppApiError ? error.status : undefined;
        if (status === 401) endSession();
        if (status === undefined || status === 0 || status >= 500) {
          setAmbiguous(true);
          setVerified(false);
        }
      } finally {
        pending.current = false;
      }
    })(event);
  return {
    form,
    ...queries,
    ...mutation,
    canSubmit,
    ambiguous,
    verified,
    setVerified,
    submit,
    changeProject,
    reset,
  };
}
