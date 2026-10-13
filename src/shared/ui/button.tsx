import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "error";
  size?: "xs" | "sm";
  loading?: boolean;
};

const variants = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  error: "btn-error",
};
const sizes = { xs: "btn-xs", sm: "btn-sm" };

export function Button({
  variant,
  size,
  loading,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const extraClasses = className
    .split(/\s+/)
    .filter((name) => name && name !== "btn")
    .join(" ");
  const classes = ["btn", variant && variants[variant], size && sizes[size], extraClasses]
    .filter(Boolean)
    .join(" ");
  return (
    <button {...props} className={classes}>
      {loading && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}
