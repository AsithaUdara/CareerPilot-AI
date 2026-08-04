import type { PropsWithChildren } from "react";
import styles from "./Panel.module.scss";

type PanelProps = PropsWithChildren<{
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  delay?: 0 | 1 | 2;
  className?: string;
}>;

export function Panel({ children, span = 12, delay = 0, className = "" }: PanelProps) {
  const classes = [
    styles.panel,
    styles[`span${span}`],
    delay ? styles[`delay${delay}`] : styles.fade,
    className
  ]
    .filter(Boolean)
    .join(" ");

  return <section className={classes}>{children}</section>;
}
