import { useEffect, useState } from "react";
import { BrandMark } from "@/atoms/BrandMark";
import { Button } from "@/atoms/Button";
import { NavItem } from "@/molecules/NavItem";
import { ANALYSIS_PAGE_IDS, ANALYSIS_SECTIONS } from "@/constants/destinations";
import { pathForPage } from "@/lib/routes";
import type { PageId } from "@/types";
import styles from "./Sidebar.module.scss";

const COLLAPSE_KEY = "careerpilot_sidebar_collapsed";

type SidebarProps = {
  page: PageId;
  hasReport: boolean;
  busy?: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate: (id: PageId) => void;
};

export function Sidebar({
  page,
  hasReport,
  busy = false,
  collapsed,
  onCollapsedChange,
  onNavigate
}: SidebarProps) {
  const onAnalysisPage = ANALYSIS_PAGE_IDS.includes(page);
  const showSubNav = hasReport && !collapsed;

  let footerAction: PageId = "upload";
  let footerLabel = "Start Upload";
  let footerCopy = "Upload a resume, verify the profile, then run analysis.";

  if (busy) {
    footerAction = "upload";
    footerLabel = "View progress";
    footerCopy = "Agents are running — progress continues even if you switch pages.";
  } else if (hasReport && onAnalysisPage) {
    // Keep footer identical across all Analysis sections so the sidebar doesn't jump.
    footerAction = "dashboard";
    footerLabel = "Back to Overview";
    footerCopy = "Switch Analysis sections anytime from the menu above.";
  } else if (hasReport) {
    footerAction = "dashboard";
    footerLabel = "Open Analysis";
    footerCopy = "Open Analysis to review your score, gaps, and next steps.";
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <button
        type="button"
        className={styles.collapseBtn}
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      <a
        href="/"
        className={styles.brand}
        onClick={(e) => {
          e.preventDefault();
          onNavigate("landing");
        }}
        title="Back to landing page"
      >
        <BrandMark showWordmark={!collapsed} />
      </a>

      <nav className={styles.nav} aria-label="Primary">
        {!collapsed && <p className={styles.navLabel}>Workspace</p>}

        <NavItem
          id="upload"
          label="Upload Resume"
          icon="⇪"
          active={page === "upload"}
          collapsed={collapsed}
          onSelect={onNavigate}
        />
        <NavItem
          id="dashboard"
          label="Analysis"
          icon="◫"
          active={onAnalysisPage && !showSubNav}
          collapsed={collapsed}
          onSelect={onNavigate}
        />

        {showSubNav && (
          <div className={styles.subNav} aria-label="Analysis sections">
            {ANALYSIS_SECTIONS.map((section) => {
              const active = page === section.id;
              return (
                <a
                  key={section.id}
                  href={pathForPage(section.id)}
                  className={`${styles.subItem} ${active ? styles.subItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(section.id);
                  }}
                >
                  {section.label}
                </a>
              );
            })}
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className={styles.footer}>
          <p className={styles.footerTitle}>Next action</p>
          <p className={styles.footerCopy}>{footerCopy}</p>
          <Button variant="primary" block onClick={() => onNavigate(footerAction)}>
            {footerLabel}
          </Button>
        </div>
      )}
    </aside>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}
