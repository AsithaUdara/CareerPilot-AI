import type { PropsWithChildren } from "react";
import { Sidebar, useSidebarCollapsed } from "@/organisms/Sidebar/Sidebar";
import { AnalysisContext } from "@/organisms/AnalysisContext";
import { TopBar } from "@/organisms/TopBar";
import { ANALYSIS_PAGE_IDS } from "@/constants/destinations";
import { useAppState } from "@/state/AppState";
import styles from "./AppShell.module.scss";

export function AppShell({ children }: PropsWithChildren) {
  const { page, setPage, report, status, busy } = useAppState();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const showContextStrip = Boolean(report) && ANALYSIS_PAGE_IDS.includes(page);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <div className={`${styles.ambient} ${styles.a}`} />
      <div className={`${styles.ambient} ${styles.b}`} />
      <div className={`${styles.ambient} ${styles.c}`} />
      <div className={styles.gridGlow} />
      <Sidebar
        page={page}
        hasReport={Boolean(report)}
        busy={busy}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onNavigate={setPage}
      />
      <div className={styles.main}>
        <TopBar page={page} status={status} />
        {showContextStrip && <AnalysisContext />}
        <main className={`${styles.content} ${page === "mentor" ? styles.contentFill : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
