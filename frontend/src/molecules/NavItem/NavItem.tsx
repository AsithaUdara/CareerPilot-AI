import type { PageId } from "@/types";
import { pathForPage } from "@/lib/routes";
import styles from "./NavItem.module.scss";

type NavItemProps = {
  id: PageId;
  label: string;
  icon: string;
  active: boolean;
  collapsed?: boolean;
  locked?: boolean;
  onSelect: (id: PageId) => void;
};

export function NavItem({
  id,
  label,
  icon,
  active,
  collapsed = false,
  locked = false,
  onSelect
}: NavItemProps) {
  return (
    <a
      href={pathForPage(id)}
      className={`${styles.item} ${active ? styles.active : ""} ${collapsed ? styles.collapsed : ""} ${locked ? styles.locked : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onSelect(id);
      }}
      title={locked ? `${label} (available after analysis)` : label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.icon}>{icon}</span>
      {!collapsed && <span className={styles.label}>{label}</span>}
    </a>
  );
}
