import { useState } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { useAppState } from "@/state/AppState";
import styles from "./PlanPage.module.scss";

const PREP_TAB_LABELS: Record<string, string> = {
  coding: "Coding",
  system_design: "System design",
  behavioral: "Behavioral",
  take_home: "Take-home"
};

function cleanText(text: string): string {
  return text
    .replace(/\[(?:learning|guidance|job|rag):\d+\]\s*/gi, "")
    .replace(/^Day \d+:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function PlanPage() {
  const { report, setPage, setUploadStep } = useAppState();
  const [prepTab, setPrepTab] = useState<string | null>(null);

  if (!report) return null;

  const interview = getAgent(report, "InterviewCoachAgent");
  const resumeOpt = getAgent(report, "ResumeOptimizationAgent");
  const interviewTags = interview?.interview_tags || {};
  const tagEntries = Object.entries(interviewTags).filter(([, items]) => items.length > 0);
  const activePrepKey = prepTab || tagEntries[0]?.[0] || "";
  const activePrepItems = activePrepKey ? interviewTags[activePrepKey] || [] : [];
  const plan = report.seven_day_plan || [];
  const resumeTips = (resumeOpt?.recommendations || []).slice(0, 5);

  const goReanalyse = () => {
    setUploadStep("review");
    setPage("upload");
  };

  const goUploadNew = () => {
    setUploadStep("intake");
    setPage("upload");
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <strong>7</strong>
          <span>Days</span>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Hiring sprint</p>
          <h2 className={styles.heroTitle}>
            {report.target_role}
            {report.seniority_level ? <span> · {report.seniority_level}</span> : null}
          </h2>
          <p className={styles.heroLead}>
            A focused week: close gaps, ship proof, practice interviews, and apply to matched roles.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={() => setPage("gaps")}>
              Review skill gaps
            </Button>
            <Button variant="secondary" onClick={() => setPage("mentor")}>
              Ask AI Mentor
            </Button>
            <Button variant="secondary" onClick={goReanalyse}>
              Re-analyse
            </Button>
            <Button variant="secondary" onClick={goUploadNew}>
              Upload new CV
            </Button>
          </div>
        </div>
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Weekly plan</p>
              <h3 className={styles.sectionTitle}>7-day sprint</h3>
            </div>
          </div>

          {plan.length === 0 ? (
            <Text muted>No sprint plan returned for this run.</Text>
          ) : (
            <ol className={styles.planList}>
              {plan.map((step, index) => (
                <li key={`${index}-${step}`} className={styles.planItem}>
                  <span className={styles.day}>
                    <small>Day</small>
                    {index + 1}
                  </span>
                  <p>{cleanText(step)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Interview prep</p>
              <h3 className={styles.sectionTitle}>Practice drills</h3>
            </div>
          </div>

          {tagEntries.length > 0 ? (
            <>
              <div className={styles.segment} role="tablist" aria-label="Interview categories">
                {tagEntries.map(([key]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activePrepKey === key}
                    className={`${styles.segmentBtn} ${activePrepKey === key ? styles.segmentActive : ""}`}
                    onClick={() => setPrepTab(key)}
                  >
                    {PREP_TAB_LABELS[key] || key}
                  </button>
                ))}
              </div>
              <ul className={styles.drillList}>
                {activePrepItems.slice(0, 5).map((item) => (
                  <li key={item}>{cleanText(item)}</li>
                ))}
              </ul>
              {activePrepItems.length > 5 && (
                <p className={styles.moreHint}>+{activePrepItems.length - 5} more drills</p>
              )}
            </>
          ) : (interview?.recommendations || []).length > 0 ? (
            <ul className={styles.drillList}>
              {(interview?.recommendations || []).slice(0, 5).map((item) => (
                <li key={item}>{cleanText(item)}</li>
              ))}
            </ul>
          ) : (
            <Text muted>No interview drills for this run.</Text>
          )}
        </section>
      </div>

      {resumeTips.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Resume tips</p>
              <h3 className={styles.sectionTitle}>Optimize before you apply</h3>
            </div>
          </div>
          <ol className={styles.tipList}>
            {resumeTips.map((tip, index) => (
              <li key={`${tip}-${index}`}>
                <span className={styles.tipNum}>{index + 1}</span>
                <p>{cleanText(tip)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
