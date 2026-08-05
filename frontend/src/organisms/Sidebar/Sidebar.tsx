import { BrandMark } from "@/atoms/BrandMark";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { NavItem } from "@/molecules/NavItem";
import type { NavItemConfig, PageId } from "@/types";
import styles from "./Sidebar.module.scss";

const NAV_ITEMS: NavItemConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: "◫" },
  { id: "upload", label: "Upload Resume", icon: "⇪" },
  { id: "readiness", label: "Readiness", icon: "◎" },
  { id: "gaps", label: "Skill Gaps", icon: "☰" },
  { id: "plan", label: "Hiring Sprint", icon: "◷" },
  { id: "reports", label: "Reports", icon: "▤" }
];

type SidebarProps = {
  page: PageId;
  hasReport: boolean;
  onNavigate: (id: PageId) => void;
};

export function Sidebar({ page, hasReport, onNavigate }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.brand}
        onClick={() => onNavigate("landing")}
        title="Back to landing page"
      >
        <BrandMark />
        <div>
          <p className={styles.brandName}>CareerPilot</p>
          <p className={styles.brandSub}>Readiness OS</p>
        </div>
      </button>

      <nav className={styles.nav} aria-label="Primary">
        <p className={styles.navLabel}>Workspace</p>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            active={page === item.id}
            onSelect={onNavigate}
          />
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.footerTitle}>Next action</p>
        <Text muted>
          {hasReport
            ? "Review skill gaps, then execute Day 1 of your hiring sprint."
            : "Upload a resume to generate your readiness report."}
        </Text>
        <Button
          variant="primary"
          block
          onClick={() => onNavigate(hasReport ? "gaps" : "upload")}
        >
          {hasReport ? "Open Skill Gaps" : "Start Upload"}
        </Button>
      </div>
    </aside>
  );
}
