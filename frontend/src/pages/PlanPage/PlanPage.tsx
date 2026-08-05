import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { INTERVIEW_TAG_LABELS } from "@/constants/itRoles";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { useAppState } from "@/state/AppState";
import styles from "./PlanPage.module.scss";

export function PlanPage() {
  const { report, setPage } = useAppState();
  const interview = getAgent(report, "InterviewCoachAgent");
  const resumeOpt = getAgent(report, "ResumeOptimizationAgent");
  const interviewTags = interview?.interview_tags || {};

  if (!report) {
    return (
      <EmptyState
        icon="◷"
        title="No hiring sprint generated"
        description="Complete analysis to unlock your personalized 7-Day Hiring Sprint."
        actionLabel="Generate Sprint"
        onAction={() => setPage("upload")}
      />
    );
  }

  return (
    <div className={styles.grid}>
      <Panel span={7}>
        <span className={styles.kicker}>Orchestrator output</span>
        <h2>7-Day Hiring Sprint</h2>
        <Text muted tiny>
          IT-focused weekly sprint — resume, GitHub artifact, interview drills, and targeted
          applications. Seniority: {report.seniority_level || "Junior"} · Role: {report.target_role}
        </Text>
        {report.explainability?.stack_emphasis && (
          <Text muted tiny>Stack focus: {report.explainability.stack_emphasis}</Text>
        )}
        {report.explainability?.portfolio_project_suggestion && (
          <Text muted tiny>
            {report.explainability.portfolio_project_suggestion}
          </Text>
        )}
        <ol className={styles.planList}>
          {report.seven_day_plan.map((step, index) => (
            <li key={`${index}-${step}`}>
              <div className={styles.dayCol}>
                <span className={styles.day}>
                  <small>Day</small>
                  {index + 1}
                </span>
              </div>
              <div className={styles.stepCard}>
                <p>{step.replace(/^Day \d+:\s*/i, "")}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel span={5} delay={1}>
        <div className={styles.agentHead}>
          <span className={styles.agentIcon}>🎤</span>
          <div>
            <span className={styles.kicker}>Interview Coach Agent</span>
            <h2>Interview prep</h2>
          </div>
        </div>
        {Object.keys(interviewTags).length > 0 ? (
          <div className={styles.tagStack}>
            {Object.entries(interviewTags).map(([key, items]) =>
              items.length > 0 ? (
                <div className={styles.tagGroup} key={key}>
                  <p className={styles.tagLabel}>{INTERVIEW_TAG_LABELS[key] || key}</p>
                  <InsightList compact items={items} />
                </div>
              ) : null
            )}
          </div>
        ) : (
          <InsightList items={interview?.recommendations || []} />
        )}
        <div className={styles.block}>
          <p className={styles.blockLabel}>Evidence</p>
          <InsightList compact items={interview?.evidence || []} />
        </div>
      </Panel>

      <Panel span={12} delay={2}>
        <div className={styles.agentHead}>
          <span className={styles.agentIcon}>📄</span>
          <div>
            <span className={styles.kicker}>Resume Optimization Agent</span>
            <h2>Resume optimization</h2>
          </div>
        </div>
        <div className={styles.twoCol}>
          <div>
            <p className={styles.blockLabel}>Recommendations</p>
            <InsightList items={resumeOpt?.recommendations || []} />
          </div>
          <div>
            <p className={styles.blockLabel}>Evidence</p>
            <InsightList compact items={resumeOpt?.evidence || []} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
