"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/shared/ui/button";

export function SidePanel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useTranslations("workspaceUi");
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="side-panel"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="side-panel-header">
        <h2 id={titleId}>{title}</h2>
        <Button type="button" variant="ghost" onClick={onClose} aria-label={t("closePanel")}>
          {t("close")}
        </Button>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
