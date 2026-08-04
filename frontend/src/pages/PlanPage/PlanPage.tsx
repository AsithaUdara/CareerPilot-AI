import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { useAppState } from "@/state/AppState";
import styles from "./PlanPage.module.scss";

export function PlanPage() {
  const { report, setPage } = useAppState();
  const interview = getAgent(report, "InterviewCoachAgent");

  if (!report) {
    return (
      <EmptyState
        title="No action plan generated"
        description="Complete analysis to unlock your personalized 7-day plan."
        actionLabel="Generate Plan"
        onAction={() => setPage("upload")}
      />
    );
  }

  return (
    <div className={styles.grid}>
      <Panel span={7}>
        <h2>7-day action plan</h2>
        <ol className={styles.planList}>
          {report.seven_day_plan.map((step, index) => (
            <li key={step}>
              <span className={styles.day}>D{index + 1}</span>
              <p>{step.replace(/^Day \d+:\s*/, "")}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel span={5} delay={1}>
        <h2>Interview coach</h2>
        <InsightList items={interview?.recommendations || []} />
        <Text muted tiny>
          Evidence
        </Text>
        <Text>{interview?.evidence?.[0]}</Text>
      </Panel>
    </div>
  );
}
