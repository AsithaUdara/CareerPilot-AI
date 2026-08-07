import type { KpiTone } from "@/types";
import styles from "./KpiCard.module.scss";

type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: KpiTone;
  icon?: string;
};

const TONE_ICONS: Record<KpiTone, string> = {
  blue: "◎",
  teal: "⌘",
  amber: "▲",
  rose: "◆"
};

export function KpiCard({ label, value, hint, tone = "blue", icon }: KpiCardProps) {
  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.top}>
        <p className={styles.label}>{label}</p>
        <span className={styles.icon}>{icon || TONE_ICONS[tone]}</span>
      </div>
      <p className={styles.value}>{value}</p>
      <p className={styles.hint}>{hint}</p>
    </article>
  );
}
