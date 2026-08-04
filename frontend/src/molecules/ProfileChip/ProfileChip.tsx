import { Avatar } from "@/atoms/Avatar";
import styles from "./ProfileChip.module.scss";

type ProfileChipProps = {
  name: string;
  detail: string;
};

export function ProfileChip({ name, detail }: ProfileChipProps) {
  return (
    <div className={styles.chip}>
      <Avatar />
      <div>
        <p className={styles.name}>{name}</p>
        <p className={styles.detail}>{detail}</p>
      </div>
    </div>
  );
}
