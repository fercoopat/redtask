"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useIssueCreateForm } from "@/modules/issues/hooks/use-issue-create-form";
import type { CreatedIssue } from "@/modules/issues/schemas/issue-creation";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

import { IssueCreateForm } from "./issue-create-form";

export function IssueCreatePanel({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreatedIssue | null>(null);
  const controller = useIssueCreateForm(open, (issue) => {
    setCreated(issue);
    setOpen(false);
    onCreated();
  });
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          disabled={controller.isCreating || controller.form.formState.isSubmitting}
          onClick={() => {
            if (open && !controller.ambiguous) controller.reset();
            setOpen(!open);
          }}
        >
          {open ? t("cancel") : t("createIssue")}
        </Button>
        {created && (
          <Alert variant="success" className="flex-1 py-2">
            {t("issueCreated", { id: created.id, subject: created.subject })}
            <a className="link" href={created.url} target="_blank" rel="noreferrer">
              {t("openIssue")}
            </a>
          </Alert>
        )}
      </div>
      <div hidden={!open}>
        <IssueCreateForm controller={controller} />
      </div>
    </>
  );
}
