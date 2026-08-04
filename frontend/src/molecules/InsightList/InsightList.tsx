import styles from "./InsightList.module.scss";

type InsightListProps = {
  items: string[];
  compact?: boolean;
};

export function InsightList({ items, compact = false }: InsightListProps) {
  return (
    <ul className={`${styles.list} ${compact ? styles.compact : ""}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
