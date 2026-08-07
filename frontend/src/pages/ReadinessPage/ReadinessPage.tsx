import { useState } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { estimateReadiness, getAgent } from "@/api/client";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./ReadinessPage.module.scss";

const AGENT_TABS = [
  {
    key: "ResumeAnalysisAgent",
    label: "Resume",
    title: "Resume analysis",
    blurb: "What we extracted and how strong it looks."
  },
  {
    key: "JobMatchingAgent",
    label: "Role fit",
    title: "Job matching",
    blurb: "How your profile lines up with the target role."
  },
  {
    key: "ResumeOptimizationAgent",
    label: "Improve",
    title: "Resume tips",
    blurb: "Concrete edits to raise readiness for this role."
  }
] as const;

function clampList(items: string[] | undefined, limit: number) {
  const list = items || [];
  return { shown: list.slice(0, limit), total: list.length };
}

export function ReadinessPage() {
  const { report, setPage, setUploadStep } = useAppState();
  const [agentTab, setAgentTab] = useState<(typeof AGENT_TABS)[number]["key"]>("JobMatchingAgent");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [expandedExplain, setExpandedExplain] = useState<string | null>(null);

  if (!report) return null;

  const readiness = estimateReadiness(report);
  const resumeAgent = getAgent(report, "ResumeAnalysisAgent");
  const matchAgent = getAgent(report, "JobMatchingAgent");
  const optAgent = getAgent(report, "ResumeOptimizationAgent");
  const agents = {
    ResumeAnalysisAgent: resumeAgent,
    JobMatchingAgent: matchAgent,
    ResumeOptimizationAgent: optAgent
  };
  const activeMeta = AGENT_TABS.find((t) => t.key === agentTab)!;
  const activeAgent = agents[agentTab];

  const skills = report.profile.skills || [];
  const visibleSkills = showAllSkills ? skills : skills.slice(0, 8);
  const summary = report.profile.summary || "";
  const summaryShort = summary.length > 180 ? `${summary.slice(0, 180).trim()}…` : summary;

  const explainability = [
    { label: "Decision", value: report.explainability?.decision_note },
    {
      label: "Evidence",
      value: report.explainability?.job_evidence || report.explainability?.rag_evidence
    },
    { label: "Memory", value: report.explainability?.memory_note }
  ].filter((b) => Boolean(b.value));

  const strengths = clampList(activeAgent?.strengths, 4);
  const recommendations = clampList(activeAgent?.recommendations, 4);
  const evidence = clampList(activeAgent?.evidence, 3);

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
        <div className={styles.scoreBlock}>
          <span className={styles.scoreValue}>{readiness}</span>
          <span className={styles.scoreLabel}>Score</span>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Career readiness</p>
          <h2 className={styles.heroTitle}>
            {report.target_role}
            <span>{report.seniority_level ? ` · ${report.seniority_level}` : ""}</span>
          </h2>
          <p className={styles.heroLead}>
            {matchAgent?.strengths?.[0] ||
              report.explainability?.decision_note ||
              "Review fit for this role, then close the highest-impact gaps."}
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={() => setPage("gaps")}>
              Review skill gaps
            </Button>
            <Button variant="secondary" onClick={() => setPage("plan")}>
              Hiring sprint
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

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Profile</p>
            <h3 className={styles.sectionTitle}>Snapshot</h3>
          </div>
          <div className={styles.linkRow}>
            {report.profile.github_url && (
              <a href={report.profile.github_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            {report.profile.linkedin_url && (
              <a href={report.profile.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            )}
          </div>
        </div>

        <div className={styles.profileGrid}>
          <div className={styles.profileMain}>
            <p className={styles.fieldLabel}>Summary</p>
            <p className={styles.bodyText}>
              {showFullSummary ? summary || "No summary extracted." : summaryShort || "No summary extracted."}
            </p>
            {summary.length > 180 && (
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => setShowFullSummary((v) => !v)}
              >
                {showFullSummary ? "Show less" : "Read more"}
              </button>
            )}

            <p className={styles.fieldLabel}>Skills</p>
            <TagList items={visibleSkills} />
            {skills.length > 8 && (
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => setShowAllSkills((v) => !v)}
              >
                {showAllSkills ? "Show fewer" : `Show all ${skills.length}`}
              </button>
            )}
          </div>

          <div className={styles.profileSide}>
            {report.profile.experience.length > 0 && (
              <div>
                <p className={styles.fieldLabel}>Experience</p>
                <ul className={styles.compactList}>
                  {report.profile.experience.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.profile.education.length > 0 && (
              <div>
                <p className={styles.fieldLabel}>Education</p>
                <ul className={styles.compactList}>
                  {report.profile.education.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {explainability.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Why this score</p>
              <h3 className={styles.sectionTitle}>Explainability</h3>
            </div>
          </div>
          <div className={styles.explainGrid}>
            {explainability.map((block) => {
              const long = (block.value || "").length > 160;
              const open = expandedExplain === block.label;
              const text =
                long && !open
                  ? `${(block.value || "").slice(0, 160).trim()}…`
                  : block.value;
              return (
                <article key={block.label} className={styles.explainItem}>
                  <p className={styles.fieldLabel}>{block.label}</p>
                  <p className={styles.explainText}>{text}</p>
                  {long && (
                    <button
                      type="button"
                      className={styles.textBtn}
                      onClick={() => setExpandedExplain(open ? null : block.label)}
                    >
                      {open ? "Show less" : "Read more"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Agent insights</p>
            <h3 className={styles.sectionTitle}>{activeMeta.title}</h3>
            <Text muted>{activeMeta.blurb}</Text>
          </div>
        </div>

        <div className={styles.segment} role="tablist" aria-label="Agent insights">
          {AGENT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={agentTab === tab.key}
              className={`${styles.segmentBtn} ${agentTab === tab.key ? styles.segmentActive : ""}`}
              onClick={() => setAgentTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!activeAgent ? (
          <Text muted>No output from this agent for this run.</Text>
        ) : (
          <div className={styles.insightCols}>
            <div className={styles.insightCol}>
              <p className={`${styles.fieldLabel} ${styles.strength}`}>Strengths</p>
              {strengths.total === 0 ? (
                <Text muted>None listed.</Text>
              ) : (
                <ul className={styles.bulletList}>
                  {strengths.shown.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {strengths.total > strengths.shown.length && (
                <p className={styles.moreHint}>
                  +{strengths.total - strengths.shown.length} more
                </p>
              )}
            </div>
            <div className={styles.insightCol}>
              <p className={styles.fieldLabel}>Recommendations</p>
              {recommendations.total === 0 ? (
                <Text muted>None listed.</Text>
              ) : (
                <ul className={styles.bulletList}>
                  {recommendations.shown.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {recommendations.total > recommendations.shown.length && (
                <p className={styles.moreHint}>
                  +{recommendations.total - recommendations.shown.length} more
                </p>
              )}
            </div>
            <div className={styles.insightCol}>
              <p className={styles.fieldLabel}>Evidence</p>
              {evidence.total === 0 ? (
                <Text muted>None listed.</Text>
              ) : (
                <ul className={styles.bulletList}>
                  {evidence.shown.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
