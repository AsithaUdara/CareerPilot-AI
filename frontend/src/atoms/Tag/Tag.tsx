import styles from "./Tag.module.scss";

type TagProps = {
  label: string;
};

export function Tag({ label }: TagProps) {
  return <span className={styles.tag}>{label}</span>;
}
