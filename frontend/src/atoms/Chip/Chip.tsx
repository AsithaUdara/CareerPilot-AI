import type { PropsWithChildren } from "react";
import styles from "./Chip.module.scss";

export function Chip({ children }: PropsWithChildren) {
  return <span className={styles.chip}>{children}</span>;
}
