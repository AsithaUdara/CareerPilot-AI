import type { PropsWithChildren } from "react";
import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { EmptyState } from "@/molecules/EmptyState";
import { useAppState } from "@/state/AppState";
import styles from "./AnalysisGate.module.scss";

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Guards analysis pages: renders children when a report is loaded, otherwise
 * shows a CV picker (saved resumes) or an empty state pointing to Upload.
 */
export function AnalysisGate({ children }: PropsWithChildren) {
  const {
    report,
    myCandidates,
    selectCandidate,
    busy,
    uploadStep,
    setPage,
    setUploadStep
  } = useAppState();

  if (report) return <>{children}</>;

  const goUpload = () => {
    setUploadStep("intake");
    setPage("upload");
  };

  if (busy && uploadStep === "running") {
    return (
      <EmptyState
        icon="◷"
        title="Analysis in progress"
        description="Agents are still building your report. Stay on Upload to watch progress, or wait here — results unlock when the run finishes."
        actionLabel="View progress"
        onAction={() => setPage("upload")}
      />
    );
  }

  if (busy) {
    return (
      <Panel span={12} className={styles.loadingCard}>
        <div className={styles.spinner} aria-hidden />
        <Text muted>Loading analysis for the selected resume…</Text>
      </Panel>
    );
  }

  if (myCandidates.length === 0) {
    return (
      <EmptyState
        icon="◎"
        title="No analysis yet"
        description="Upload a resume and run the analysis to unlock your readiness report, skill gaps, and hiring sprint."
        actionLabel="Upload a resume"
        onAction={goUpload}
      />
    );
  }

  return (
    <div className={styles.gate}>
      <Panel span={12} className={styles.pickerCard}>
        <div className={styles.pickerHead}>
          <div>
            <p className={styles.kicker}>Analysis</p>
            <h2 className={styles.title}>Select a resume to continue</h2>
            <Text muted>
              Choose one of your saved resumes to open its analysis, or upload a new one.
            </Text>
          </div>
          <Button variant="secondary" onClick={goUpload}>
            Upload new resume
          </Button>
        </div>

        <div className={styles.cvGrid}>
          {myCandidates.map((cv) => {
            const date = formatDate(cv.created_at);
            return (
              <button
                key={cv.candidate_id}
                type="button"
                className={styles.cvCard}
                onClick={() => void selectCandidate(cv.candidate_id)}
              >
                <span className={styles.cvIcon} aria-hidden>
                  ▤
                </span>
                <span className={styles.cvName} title={cv.filename}>
                  {cv.filename}
                </span>
                {cv.summary && (
                  <span className={styles.cvSummary}>
                    {cv.summary.length > 110 ? `${cv.summary.slice(0, 110).trim()}…` : cv.summary}
                  </span>
                )}
                <span className={styles.cvFoot}>
                  {date && <span className={styles.cvDate}>{date}</span>}
                  <span className={styles.cvCta}>Open analysis →</span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
