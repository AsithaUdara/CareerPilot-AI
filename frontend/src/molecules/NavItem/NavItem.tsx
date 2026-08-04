import type { PageId } from "@/types";
import styles from "./NavItem.module.scss";

type NavItemProps = {
  id: PageId;
  label: string;
  icon: string;
  active: boolean;
  onSelect: (id: PageId) => void;
};

export function NavItem({ id, label, icon, active, onSelect }: NavItemProps) {
  return (
    <button
      className={`${styles.item} ${active ? styles.active : ""}`}
      onClick={() => onSelect(id)}
      type="button"
    >
      <span className={styles.icon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
