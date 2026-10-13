import type { HTMLAttributes } from "react";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "success" | "warning" | "error";
};

const variants = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

export function Alert({ variant = "info", className = "", ...props }: AlertProps) {
  return (
    <div
      {...props}
      role={props.role ?? (variant === "error" ? "alert" : "status")}
      className={`alert ${variants[variant]} ${className}`}
    />
  );
}
