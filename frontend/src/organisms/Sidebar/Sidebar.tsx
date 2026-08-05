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
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "mentor", label: "AI Mentor", icon: "✦" },
  { id: "analytics", label: "Analytics", icon: "↗" },
  { id: "insights", label: "Workspace", icon: "▣" }
];

type SidebarProps = {
  page: PageId;
  hasReport: boolean;
  busy?: boolean;
  onNavigate: (id: PageId) => void;
};

export function Sidebar({ page, hasReport, busy = false, onNavigate }: SidebarProps) {
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
          {busy
            ? "Agents are running — progress continues even if you switch pages."
            : hasReport
              ? "Review skill gaps, then execute Day 1 of your hiring sprint."
              : "Upload a resume, verify the extracted profile, then run analysis."}
        </Text>
        <Button
          variant="primary"
          block
          onClick={() => onNavigate(busy ? "upload" : hasReport ? "gaps" : "upload")}
        >
          {busy ? "View progress" : hasReport ? "Open Skill Gaps" : "Start Upload"}
        </Button>
      </div>
    </aside>
  );
}
