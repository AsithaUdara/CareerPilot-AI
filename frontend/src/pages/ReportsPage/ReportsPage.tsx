import { useEffect, useState } from "react";
import { Button } from "@/atoms/Button";
import { Chip } from "@/atoms/Chip";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { exportReportPdf, getAgent, getReport, listReports } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { useAppState } from "@/state/AppState";
import styles from "./ReportsPage.module.scss";

export function ReportsPage() {
  const {
    candidateId,
    reports,
    setReports,
    setReport,
    setProfile,
    setPage,
    setStatus,
    report
  } = useAppState();
  const [loading, setLoading] = useState(false);
  const [compareReport, setCompareReport] = useState<typeof report | null>(null);

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
      setProfile(data.profile);
      setPage("dashboard");
      setStatus(
        `Loaded report (${data.job_source || "curated"} jobs, score ${data.readiness_score ?? "n/a"}).`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open report");
    }
  };

  const compareWith = async (reportId: string) => {
    try {
      setStatus("Loading report for comparison...");
      const data = await getReport(reportId);
      setCompareReport(data);
      setStatus("Comparison loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not compare reports");
    }
  };

  const downloadPdf = async (reportId: string) => {
    try {
      setStatus("Generating PDF export...");
      const blob = await exportReportPdf(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `careerpilot-${reportId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("PDF exported.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PDF export failed");
    }
  };

  const compareMetrics =
    report && compareReport
      ? {
          scoreDelta: (report.readiness_score || 0) - (compareReport.readiness_score || 0),
          gapsNow: getAgent(report, "SkillGapAgent")?.gaps || [],
          gapsBefore: getAgent(compareReport, "SkillGapAgent")?.gaps || [],
        }
      : null;
  const closedGaps = compareMetrics
    ? compareMetrics.gapsBefore.filter((gap) => !compareMetrics.gapsNow.includes(gap))
    : [];
  const newGaps = compareMetrics
    ? compareMetrics.gapsNow.filter((gap) => !compareMetrics.gapsBefore.includes(gap))
    : [];

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
    <div className={styles.stack}>
      <Panel>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>Analysis history</span>
            <h2>Saved analyses</h2>
          </div>
          <Chip>{loading ? "Refreshing..." : `${reports.length} reports`}</Chip>
        </div>
        {report?.report_id && (
          <div className={styles.quickActions}>
            <Button variant="primary" onClick={() => void downloadPdf(report.report_id!)}>
              Download PDF report
            </Button>
            <Text muted tiny>
              Tip: click <strong>Compare</strong> on any row to see progress vs your active report.
            </Text>
          </div>
        )}
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow}`}>
            <span>Report</span>
            <span>Target role</span>
            <span>Created</span>
            <span />
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
              <Button variant="secondary" size="sm" onClick={() => void compareWith(item.report_id)}>
                Compare
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      {compareMetrics && (
        <Panel delay={1}>
          <div className={styles.head}>
            <div>
              <span className={styles.kicker}>Re-analysis comparison</span>
              <h2>Current vs selected report</h2>
            </div>
            <Chip>{compareMetrics.scoreDelta >= 0 ? "Improved" : "Needs work"}</Chip>
          </div>
          <div className={styles.compareGrid}>
            <div className={`${styles.metricCard} ${compareMetrics.scoreDelta >= 0 ? styles.good : styles.warn}`}>
              <p className={styles.metricLabel}>Readiness delta</p>
              <p className={styles.metricValue}>
                {compareMetrics.scoreDelta >= 0 ? "+" : ""}
                {compareMetrics.scoreDelta}
              </p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Closed gaps</p>
              <div className={styles.pillRow}>
                {closedGaps.length > 0 ? (
                  closedGaps.map((gap) => (
                    <span key={gap} className={`${styles.gapPill} ${styles.closed}`}>
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className={styles.emptyPill}>None</span>
                )}
              </div>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>New gaps</p>
              <div className={styles.pillRow}>
                {newGaps.length > 0 ? (
                  newGaps.map((gap) => (
                    <span key={gap} className={`${styles.gapPill} ${styles.new}`}>
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className={styles.emptyPill}>None</span>
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {report?.matched_jobs && report.matched_jobs.length > 0 && (
        <Panel delay={1}>
          <div className={styles.head}>
            <div>
              <span className={styles.kicker}>Job Matching Agent</span>
              <h2>Jobs from active report</h2>
            </div>
            <Chip>{report.job_source || "curated"}</Chip>
          </div>
          <div className={styles.jobStack}>
            {report.matched_jobs.map((job) => (
              <div className={styles.jobRow} key={job.id}>
                <div>
                  <Text>{job.label}</Text>
                  <Text muted tiny>
                    {job.required_skills?.slice(0, 6).join(", ")}
                  </Text>
                </div>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <Text muted tiny>
                    {job.source}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
