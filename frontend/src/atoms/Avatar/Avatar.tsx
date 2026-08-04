import styles from "./Avatar.module.scss";

type AvatarProps = {
  label?: string;
};

export function Avatar({ label = "CP" }: AvatarProps) {
  return <div className={styles.avatar}>{label}</div>;
}
