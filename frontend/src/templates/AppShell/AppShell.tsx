import type { PropsWithChildren } from "react";
import { Sidebar } from "@/organisms/Sidebar";
import { TopBar } from "@/organisms/TopBar";
import { useAppState } from "@/state/AppState";
import styles from "./AppShell.module.scss";

export function AppShell({ children }: PropsWithChildren) {
  const { page, setPage, report, status, candidateId } = useAppState();

  return (
    <div className={styles.shell}>
      <div className={`${styles.ambient} ${styles.a}`} />
      <div className={`${styles.ambient} ${styles.b}`} />
      <div className={`${styles.ambient} ${styles.c}`} />
      <div className={styles.gridGlow} />
      <Sidebar page={page} hasReport={Boolean(report)} onNavigate={setPage} />
      <div className={styles.main}>
        <TopBar page={page} status={status} candidateId={candidateId} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
