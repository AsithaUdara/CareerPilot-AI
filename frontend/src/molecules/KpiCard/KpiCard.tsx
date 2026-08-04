import type { KpiTone } from "@/types";
import styles from "./KpiCard.module.scss";

type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: KpiTone;
};

export function KpiCard({ label, value, hint, tone = "blue" }: KpiCardProps) {
  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      <p className={styles.hint}>{hint}</p>
    </article>
  );
}
