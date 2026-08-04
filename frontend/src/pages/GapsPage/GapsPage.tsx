import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getAgent } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./GapsPage.module.scss";

export function GapsPage() {
  const { report, setPage } = useAppState();
  const gapAgent = getAgent(report, "SkillGapAgent");
  const planAgent = getAgent(report, "LearningPlannerAgent");

  if (!report) {
    return (
      <EmptyState
        title="No skill-gap analysis yet"
        description="Run analysis to prioritize the skills that most affect readiness."
        actionLabel="Start Analysis"
        onAction={() => setPage("upload")}
      />
    );
  }

  const gaps = gapAgent?.gaps || [];

  return (
    <div className={styles.grid}>
      <Panel span={5}>
        <h2>Priority gaps</h2>
        <div className={styles.gapList}>
          {gaps.length === 0 && <Text muted>No critical gaps detected for this role.</Text>}
          {gaps.map((gap, index) => (
            <div className={styles.gapItem} key={gap}>
              <span className={styles.rank}>{index + 1}</span>
              <div>
                <p className={styles.gapName}>{gap}</p>
                <Text muted tiny>
                  {gapAgent?.evidence?.[index] || "High impact for target-role screening."}
                </Text>
              </div>
              <div className={styles.meter}>
                <span style={{ width: `${90 - index * 12}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel span={7} delay={1}>
        <h2>Learning roadmap</h2>
        <InsightList items={planAgent?.recommendations || []} />
        <Text muted tiny>
          Required role skills
        </Text>
        <TagList
          items={(report.explainability?.required_skills || "")
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)}
        />
      </Panel>
    </div>
  );
}
