import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="form-control gap-1">
      <label className="label" htmlFor={htmlFor}>
        <span className="label-text">{label}</span>
      </label>
      {children}
      {error ? (
        <span
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-sm text-error"
        >
          {error}
        </span>
      ) : hint ? (
        <span id={htmlFor ? `${htmlFor}-help` : undefined} className="text-sm text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
