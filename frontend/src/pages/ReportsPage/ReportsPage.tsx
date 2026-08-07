import { useEffect, useState } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { estimateReadiness, exportReportPdf, getAgent, getReport, listReports } from "@/api/client";
import { useAppState } from "@/state/AppState";
import type { CareerReadinessReport } from "@/types";
import styles from "./ReportsPage.module.scss";

function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function ReportsPage() {
  const {
    candidateId,
    reports,
    setReports,
    setReport,
    setProfile,
    setPage,
    setStatus,
    report,
    setUploadStep
  } = useAppState();
  const [loading, setLoading] = useState(false);
  const [compareReport, setCompareReport] = useState<CareerReadinessReport | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  if (!report || !candidateId) return null;

  const openReport = async (reportId: string) => {
    try {
      setBusyId(reportId);
      setStatus("Loading saved report...");
      const data = await getReport(reportId);
      setReport(data);
      setProfile(data.profile);
      setCompareReport(null);
      setPage("dashboard");
      setStatus(`Loaded report for ${data.target_role}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open report");
    } finally {
      setBusyId(null);
    }
  };

  const compareWith = async (reportId: string) => {
    if (compareReport?.report_id === reportId) {
      setCompareReport(null);
      return;
    }
    try {
      setBusyId(reportId);
      setStatus("Loading report for comparison...");
      const data = await getReport(reportId);
      setCompareReport(data);
      setStatus("Comparison ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not compare reports");
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (reportId: string) => {
    try {
      setBusyId(reportId);
      setStatus("Generating PDF export...");
      const { blob, filename } = await exportReportPdf(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("PDF exported.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setBusyId(null);
    }
  };

  const activeScore = estimateReadiness(report);
  const compareScore = compareReport ? estimateReadiness(compareReport) : null;
  const scoreDelta =
    compareScore !== null ? activeScore - compareScore : null;
  const gapsNow = getAgent(report, "SkillGapAgent")?.gaps || [];
  const gapsBefore = compareReport
    ? getAgent(compareReport, "SkillGapAgent")?.gaps || []
    : [];
  const closedGaps = gapsBefore.filter((gap) => !gapsNow.includes(gap));
  const newGaps = gapsNow.filter((gap) => !gapsBefore.includes(gap));
  const jobs = report.matched_jobs || [];

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Saved reports</p>
            <h2 className={styles.sectionTitle}>Analysis history</h2>
            <p className={styles.lead}>
              {loading
                ? "Refreshing saved analyses…"
                : `${reports.length} saved ${reports.length === 1 ? "analysis" : "analyses"} for this CV.`}
            </p>
          </div>
          <div className={styles.actions}>
            {report.report_id && (
              <Button
                variant="primary"
                onClick={() => void downloadPdf(report.report_id!)}
                disabled={busyId === report.report_id}
              >
                Download PDF
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setUploadStep("review");
                setPage("upload");
                setStatus("Adjust role or stack, then analyze again.");
              }}
            >
              Re-analyse
            </Button>
          </div>
        </div>

        {reports.length === 0 ? (
          <Text muted>No reports saved for this CV yet.</Text>
        ) : (
          <ul className={styles.reportList}>
            {reports.map((item) => {
              const isActive = item.report_id === report.report_id;
              const isComparing = item.report_id === compareReport?.report_id;
              return (
                <li
                  key={item.report_id}
                  className={`${styles.reportItem} ${isActive ? styles.reportActive : ""}`}
                >
                  <div className={styles.reportMeta}>
                    <strong>{item.target_role}</strong>
                    <span>
                      {formatWhen(item.created_at)}
                      {isActive ? " · Active" : ""}
                    </span>
                  </div>
                  <div className={styles.reportActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === item.report_id}
                      onClick={() => void openReport(item.report_id)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === item.report_id || isActive}
                      onClick={() => void compareWith(item.report_id)}
                    >
                      {isComparing ? "Hide" : "Compare"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === item.report_id}
                      onClick={() => void downloadPdf(item.report_id)}
                    >
                      PDF
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {compareReport && scoreDelta !== null && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Comparison</p>
              <h3 className={styles.sectionTitle}>
                Active vs {compareReport.target_role}
              </h3>
              <p className={styles.lead}>
                Compared with analysis from{" "}
                {formatWhen(
                  reports.find((r) => r.report_id === compareReport.report_id)?.created_at
                )}
              </p>
            </div>
            <span
              className={`${styles.delta} ${scoreDelta >= 0 ? styles.deltaUp : styles.deltaDown}`}
            >
              {scoreDelta >= 0 ? "+" : ""}
              {scoreDelta} score
            </span>
          </div>

          <div className={styles.compareGrid}>
            <article className={styles.compareCard}>
              <p className={styles.fieldLabel}>Active score</p>
              <strong className={styles.compareValue}>{activeScore}</strong>
            </article>
            <article className={styles.compareCard}>
              <p className={styles.fieldLabel}>Compared score</p>
              <strong className={styles.compareValue}>{compareScore}</strong>
            </article>
            <article className={styles.compareCard}>
              <p className={styles.fieldLabel}>Closed gaps</p>
              <p className={styles.compareText}>
                {closedGaps.length ? closedGaps.slice(0, 3).join(" · ") : "None"}
              </p>
            </article>
            <article className={styles.compareCard}>
              <p className={styles.fieldLabel}>New gaps</p>
              <p className={styles.compareText}>
                {newGaps.length ? newGaps.slice(0, 3).join(" · ") : "None"}
              </p>
            </article>
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>From active report</p>
              <h3 className={styles.sectionTitle}>Matched jobs</h3>
            </div>
            <span className={styles.sourcePill}>{report.job_source || "curated"}</span>
          </div>
          <ul className={styles.jobList}>
            {jobs.slice(0, 4).map((job) => (
              <li key={job.id} className={styles.jobItem}>
                <div>
                  <strong>{job.label}</strong>
                  <span>
                    {job.company || "Company n/a"}
                    {job.required_skills?.length
                      ? ` · ${job.required_skills.slice(0, 4).join(", ")}`
                      : ""}
                  </span>
                </div>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Open →
                  </a>
                ) : (
                  <span className={styles.sourcePill}>{job.source}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
