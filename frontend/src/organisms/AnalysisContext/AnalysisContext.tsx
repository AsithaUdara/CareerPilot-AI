import { estimateReadiness } from "@/api/client";
import { useAppState } from "@/state/AppState";
import styles from "./AnalysisContext.module.scss";

/** Slim context strip shown above analysis pages: active CV, score, and a CV switcher. */
export function AnalysisContext() {
  const { report, myCandidates, candidateId, selectCandidate, targetRole, busy } = useAppState();

  if (!report) return null;

  const activeCv = myCandidates.find((c) => c.candidate_id === candidateId);
  const score = estimateReadiness(report);
  const roleLine = `${report.target_role || targetRole}${
    report.seniority_level ? ` · ${report.seniority_level}` : ""
  }`;

  return (
    <div className={styles.bar}>
      <div className={styles.context}>
        <span className={styles.score} title="Readiness score">
          {score}
        </span>
        <div className={styles.meta}>
          <strong>{activeCv?.filename || "Current CV"}</strong>
          <span>{roleLine}</span>
        </div>
      </div>

      {myCandidates.length > 1 && (
        <label className={styles.switcher}>
          <span>Switch CV</span>
          <select
            value={candidateId}
            disabled={busy}
            onChange={(e) => void selectCandidate(e.target.value)}
            aria-label="Switch resume"
          >
            {myCandidates.map((cv) => (
              <option key={cv.candidate_id} value={cv.candidate_id}>
                {cv.filename}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
