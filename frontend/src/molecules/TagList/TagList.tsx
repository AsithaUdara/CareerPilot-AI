import { Tag } from "@/atoms/Tag";
import styles from "./TagList.module.scss";

type TagListProps = {
  items: string[];
};

export function TagList({ items }: TagListProps) {
  return (
    <div className={styles.wrap}>
      {items.map((item) => (
        <Tag key={item} label={item} />
      ))}
    </div>
  );
}
