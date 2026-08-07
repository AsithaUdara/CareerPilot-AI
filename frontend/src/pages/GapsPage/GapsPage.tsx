import { useState } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./GapsPage.module.scss";

function impactLabel(index: number): "Critical" | "High" | "Medium" {
  if (index === 0) return "Critical";
  if (index === 1) return "High";
  return "Medium";
}

function impactClass(index: number): string {
  if (index === 0) return styles.impactCritical;
  if (index === 1) return styles.impactHigh;
  return styles.impactMedium;
}

/** Soften noisy RAG citation prefixes for display. */
function cleanEvidence(text: string): string {
  return text
    .replace(/\[(?:learning|guidance|job|rag):\d+\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function GapsPage() {
  const { report, setPage, setUploadStep } = useAppState();
  const [expandedGap, setExpandedGap] = useState<number | null>(0);

  if (!report) return null;

  const gapAgent = getAgent(report, "SkillGapAgent");
  const planAgent = getAgent(report, "LearningPlannerAgent");
  const gaps = gapAgent?.gaps || [];
  const roadmap = planAgent?.recommendations || [];
  const roleSkills = (report.explainability?.required_skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCount}>
          <strong>{gaps.length}</strong>
          <span>Gaps</span>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Skill gaps</p>
          <h2 className={styles.heroTitle}>
            {report.target_role}
            {report.seniority_level ? (
              <span> · {report.seniority_level}</span>
            ) : null}
          </h2>
          <p className={styles.heroLead}>
            Close the highest-impact gaps first. Follow the roadmap, then run the hiring sprint.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={() => setPage("plan")}>
              Open hiring sprint
            </Button>
            <Button variant="secondary" onClick={() => setPage("mentor")}>
              Ask AI Mentor
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setUploadStep("review");
                setPage("upload");
              }}
            >
              Re-analyse
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setUploadStep("intake");
                setPage("upload");
              }}
            >
              Upload new CV
            </Button>
          </div>
        </div>
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Priority list</p>
              <h3 className={styles.sectionTitle}>What to close first</h3>
            </div>
          </div>

          {gaps.length === 0 ? (
            <Text muted>No critical gaps detected for this role.</Text>
          ) : (
            <ol className={styles.gapList}>
              {gaps.map((gap, index) => {
                const open = expandedGap === index;
                const raw = gapAgent?.evidence?.[index] || "";
                const evidence = cleanEvidence(raw);
                const short =
                  evidence.length > 140 ? `${evidence.slice(0, 140).trim()}…` : evidence;

                return (
                  <li
                    key={`${gap}-${index}`}
                    className={`${styles.gapItem} ${index === 0 ? styles.gapFirst : ""}`}
                  >
                    <span className={`${styles.rank} ${index < 2 ? styles[`rank${index}`] : ""}`}>
                      {index + 1}
                    </span>
                    <div className={styles.gapBody}>
                      <div className={styles.gapTop}>
                        <p className={styles.gapName}>{gap}</p>
                        <span className={`${styles.impact} ${impactClass(index)}`}>
                          {impactLabel(index)}
                        </span>
                      </div>
                      {evidence && (
                        <>
                          <p className={styles.gapEvidence}>{open ? evidence : short}</p>
                          {evidence.length > 140 && (
                            <button
                              type="button"
                              className={styles.textBtn}
                              onClick={() => setExpandedGap(open ? null : index)}
                            >
                              {open ? "Show less" : "Why it matters"}
                            </button>
                          )}
                        </>
                      )}
                      <div className={styles.meter} aria-hidden>
                        <span style={{ width: `${Math.max(28, 92 - index * 14)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Learning plan</p>
              <h3 className={styles.sectionTitle}>Roadmap</h3>
            </div>
          </div>

          {roadmap.length === 0 ? (
            <Text muted>No learning roadmap returned for this run.</Text>
          ) : (
            <ol className={styles.roadmap}>
              {roadmap.slice(0, 6).map((step, index) => (
                <li key={`${step}-${index}`} className={styles.roadmapItem}>
                  <span className={styles.phase}>Phase {index + 1}</span>
                  <p>{cleanEvidence(step)}</p>
                </li>
              ))}
            </ol>
          )}

          {roadmap.length > 6 && (
            <p className={styles.moreHint}>+{roadmap.length - 6} more steps in the full plan</p>
          )}
        </section>
      </div>

      {roleSkills.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Target role</p>
              <h3 className={styles.sectionTitle}>Skills employers expect</h3>
            </div>
          </div>
          <TagList items={roleSkills} />
        </section>
      )}
    </div>
  );
}
