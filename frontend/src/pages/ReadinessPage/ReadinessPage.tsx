import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./ReadinessPage.module.scss";

export function ReadinessPage() {
  const { report, setPage } = useAppState();
  const resumeAgent = getAgent(report, "ResumeAnalysisAgent");
  const matchAgent = getAgent(report, "JobMatchingAgent");
  const optAgent = getAgent(report, "ResumeOptimizationAgent");

  if (!report) {
    return (
      <EmptyState
        title="Readiness report unavailable"
        description="Generate an analysis first to view explainable readiness evidence."
        actionLabel="Upload Resume"
        onAction={() => setPage("upload")}
      />
    );
  }

  const agents = [resumeAgent, matchAgent, optAgent].filter(Boolean);

  return (
    <div className={styles.grid}>
      <Panel span={6}>
        <h2>Profile snapshot</h2>
        <Text muted tiny>
          Summary
        </Text>
        <Text>{report.profile.summary}</Text>
        <Text muted tiny>
          Skills
        </Text>
        <TagList items={report.profile.skills} />
      </Panel>

      <Panel span={6} delay={1}>
        <h2>Explainability</h2>
        <Text muted tiny>
          Decision note
        </Text>
        <Text>{report.explainability?.decision_note}</Text>
        <Text muted tiny>
          RAG evidence
        </Text>
        <Text>{report.explainability?.rag_evidence}</Text>
      </Panel>

      {agents.map((agent, index) => (
        <Panel span={4} delay={(index + 1) as 1 | 2} key={agent!.name}>
          <h3>{agent!.name.replace("Agent", "")}</h3>
          {agent!.strengths?.length > 0 && (
            <>
              <Text muted tiny>
                Strengths
              </Text>
              <InsightList compact items={agent!.strengths} />
            </>
          )}
          {agent!.recommendations?.length > 0 && (
            <>
              <Text muted tiny>
                Recommendations
              </Text>
              <InsightList compact items={agent!.recommendations} />
            </>
          )}
        </Panel>
      ))}
    </div>
  );
}
