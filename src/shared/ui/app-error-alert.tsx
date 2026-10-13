"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { AppErrorCode } from "@/shared/schemas/api-error";

import { errorMessageKeys } from "../errors/error-message-keys";
import { Alert } from "./alert";

export function AppErrorAlert({
  code,
  details = [],
  children,
}: {
  code?: AppErrorCode;
  details?: string[];
  children?: ReactNode;
}) {
  const t = useTranslations();
  return (
    <Alert variant="error" className="text-sm">
      <div>
        {code ? <p>{t(errorMessageKeys[code])}</p> : children}
        {details.map((detail, index) => (
          <p key={`${detail}-${index}`}>{detail}</p>
        ))}
      </div>
    </Alert>
  );
}
