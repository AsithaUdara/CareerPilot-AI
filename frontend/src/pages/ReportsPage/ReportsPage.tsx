import { useEffect, useState } from "react";
import { Button } from "@/atoms/Button";
import { Chip } from "@/atoms/Chip";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getReport, listReports } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { useAppState } from "@/state/AppState";
import styles from "./ReportsPage.module.scss";

export function ReportsPage() {
  const { candidateId, reports, setReports, setReport, setPage, setStatus } = useAppState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!candidateId) return;
      try {
        setLoading(true);
        const data = await listReports(candidateId);
        if (active) setReports(data);
      } catch (error) {
        if (active) {
          setStatus(error instanceof Error ? error.message : "Failed to load reports");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [candidateId, setReports, setStatus]);

  const openReport = async (reportId: string) => {
    try {
      setStatus("Loading saved report...");
      const data = await getReport(reportId);
      setReport(data);
      setPage("dashboard");
      setStatus("Saved report loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open report");
    }
  };

  if (!candidateId) {
    return (
      <EmptyState
        title="No candidate selected"
        description="Upload a resume first to create and browse saved reports."
        actionLabel="Upload Resume"
        onAction={() => setPage("upload")}
      />
    );
  }

  return (
    <Panel>
      <div className={styles.head}>
        <h2>Saved analyses</h2>
        <Chip>{loading ? "Refreshing..." : `${reports.length} reports`}</Chip>
      </div>
      <div className={styles.table}>
        <div className={`${styles.row} ${styles.headRow}`}>
          <span>Report</span>
          <span>Target role</span>
          <span>Created</span>
          <span />
        </div>
        {reports.length === 0 && <Text muted>No reports saved for this candidate yet.</Text>}
        {reports.map((item) => (
          <div className={styles.row} key={item.report_id}>
            <span className={styles.mono}>{item.report_id.slice(0, 8)}</span>
            <span>{item.target_role}</span>
            <span>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</span>
            <Button variant="secondary" size="sm" onClick={() => void openReport(item.report_id)}>
              Open
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
