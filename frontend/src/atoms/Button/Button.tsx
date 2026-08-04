import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import styles from "./Button.module.scss";

type Variant = "primary" | "secondary";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    block?: boolean;
    size?: "md" | "sm";
  }
>;

export function Button({
  children,
  variant = "primary",
  block = false,
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size === "sm" ? styles.sm : "",
    block ? styles.block : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="button" {...rest}>
      {children}
    </button>
  );
}
