import styles from "./StatusPill.module.scss";

type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  return <div className={styles.pill}>{label}</div>;
}
