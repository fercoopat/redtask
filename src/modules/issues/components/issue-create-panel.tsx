"use client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useIssueCreateForm } from "@/modules/issues/hooks/use-issue-create-form";
import type { CreatedIssue } from "@/modules/issues/schemas/issue-creation";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { SidePanel } from "@/shared/ui/side-panel";

import { IssueCreateForm } from "./issue-create-form";

export function IssueCreatePanel({
  onCreated,
  projectId,
}: {
  onCreated: () => void;
  projectId?: number | null;
}) {
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
            if (!open && projectId && !controller.form.getValues("projectId"))
              controller.changeProject(projectId);
            setOpen(!open);
          }}
        >
          <Plus size={16} aria-hidden="true" />
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
      <SidePanel
        open={open}
        title={t("createIssue")}
        onClose={() => {
          if (
            !controller.isCreating &&
            !controller.form.formState.isSubmitting &&
            !controller.ambiguous
          )
            controller.reset();
          setOpen(false);
        }}
      >
        <IssueCreateForm controller={controller} />
      </SidePanel>
    </>
  );
}
