import type { PropsWithChildren } from "react";
import styles from "./Text.module.scss";

type TextProps = PropsWithChildren<{
  muted?: boolean;
  tiny?: boolean;
  mono?: boolean;
  as?: "p" | "span";
}>;

export function Text({
  children,
  muted = false,
  tiny = false,
  mono = false,
  as = "p"
}: TextProps) {
  const className = [
    styles.text,
    muted ? styles.muted : "",
    tiny ? styles.tiny : "",
    mono ? styles.mono : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (as === "span") {
    return <span className={className}>{children}</span>;
  }
  return <p className={className}>{children}</p>;
}
