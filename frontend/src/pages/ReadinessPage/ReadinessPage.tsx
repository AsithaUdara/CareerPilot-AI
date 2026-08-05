import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./ReadinessPage.module.scss";

const AGENT_META: Record<string, { icon: string; blurb: string }> = {
  ResumeAnalysisAgent: { icon: "🧠", blurb: "Structured extraction" },
  JobMatchingAgent: { icon: "🎯", blurb: "Role compatibility" },
  ResumeOptimizationAgent: { icon: "📄", blurb: "Targeted improvements" }
};

export function ReadinessPage() {
  const { report, setPage } = useAppState();
  const resumeAgent = getAgent(report, "ResumeAnalysisAgent");
  const matchAgent = getAgent(report, "JobMatchingAgent");
  const optAgent = getAgent(report, "ResumeOptimizationAgent");

  if (!report) {
    return (
      <EmptyState
        icon="◈"
        title="Readiness report unavailable"
        description="Generate an analysis first to view explainable readiness evidence."
        actionLabel="Upload Resume"
        onAction={() => setPage("upload")}
      />
    );
  }

  const agents = [resumeAgent, matchAgent, optAgent].filter(Boolean);

  const explainabilityBlocks = [
    { label: "Decision note", value: report.explainability?.decision_note },
    { label: "RAG evidence", value: report.explainability?.rag_evidence },
    { label: "Job evidence", value: report.explainability?.job_evidence },
    { label: "Memory", value: report.explainability?.memory_note }
  ].filter((block) => Boolean(block.value));

  return (
    <div className={styles.grid}>
      <Panel span={6}>
        <span className={styles.kicker}>Candidate profile</span>
        <h2>Profile snapshot</h2>
        <div className={styles.block}>
          <p className={styles.blockLabel}>Summary</p>
          <Text>{report.profile.summary}</Text>
        </div>
        <div className={styles.block}>
          <p className={styles.blockLabel}>Skills</p>
          <TagList items={report.profile.skills} />
        </div>
        {(report.profile.github_url || report.profile.linkedin_url) && (
          <div className={styles.block}>
            <p className={styles.blockLabel}>Portfolio</p>
            {report.profile.github_url && (
              <a href={report.profile.github_url} target="_blank" rel="noreferrer">
                GitHub profile
              </a>
            )}
            {report.profile.linkedin_url && (
              <a href={report.profile.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn profile
              </a>
            )}
          </div>
        )}
        {report.profile.education.length > 0 && (
          <div className={styles.block}>
            <p className={styles.blockLabel}>Education</p>
            <InsightList compact items={report.profile.education} />
          </div>
        )}
        {report.profile.experience.length > 0 && (
          <div className={styles.block}>
            <p className={styles.blockLabel}>Experience</p>
            <InsightList compact items={report.profile.experience} />
          </div>
        )}
        {report.profile.projects.length > 0 && (
          <div className={styles.block}>
            <p className={styles.blockLabel}>Projects</p>
            <InsightList compact items={report.profile.projects} />
          </div>
        )}
      </Panel>

      <Panel span={6} delay={1}>
        <span className={styles.kicker}>No opaque scores</span>
        <h2>Explainability</h2>
        <div className={styles.evidenceStack}>
          {explainabilityBlocks.map((block) => (
            <div className={styles.evidenceCard} key={block.label}>
              <p className={styles.blockLabel}>{block.label}</p>
              <Text>{block.value}</Text>
            </div>
          ))}
          {explainabilityBlocks.length === 0 && (
            <Text muted>No explainability notes returned for this run.</Text>
          )}
        </div>
      </Panel>

      {agents.map((agent, index) => {
        const meta = AGENT_META[agent!.name] || { icon: "🤖", blurb: "Agent output" };
        return (
          <Panel span={4} delay={(index + 1) as 1 | 2} key={agent!.name}>
            <div className={styles.agentHead}>
              <span className={styles.agentIcon}>{meta.icon}</span>
              <div>
                <h3>{agent!.name.replace("Agent", "")}</h3>
                <p className={styles.agentBlurb}>{meta.blurb}</p>
              </div>
            </div>
            {agent!.strengths?.length > 0 && (
              <div className={styles.block}>
                <p className={`${styles.blockLabel} ${styles.strengthLabel}`}>Strengths</p>
                <InsightList compact items={agent!.strengths} />
              </div>
            )}
            {agent!.recommendations?.length > 0 && (
              <div className={styles.block}>
                <p className={styles.blockLabel}>Recommendations</p>
                <InsightList compact items={agent!.recommendations} />
              </div>
            )}
            {agent!.evidence?.length > 0 && (
              <div className={styles.block}>
                <p className={styles.blockLabel}>Evidence</p>
                <InsightList compact items={agent!.evidence} />
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
