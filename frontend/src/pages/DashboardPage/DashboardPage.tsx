import { Button } from "@/atoms/Button";
import { Chip } from "@/atoms/Chip";
import { Panel } from "@/atoms/Panel";
import { estimateReadiness, getAgent } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { InsightList } from "@/molecules/InsightList";
import { KpiCard } from "@/molecules/KpiCard";
import { useAppState } from "@/state/AppState";
import styles from "./DashboardPage.module.scss";

export function DashboardPage() {
  const { report, setPage } = useAppState();
  const readiness = estimateReadiness(report);
  const gaps = getAgent(report, "SkillGapAgent")?.gaps || [];
  const match = getAgent(report, "JobMatchingAgent");

  if (!report) {
    return (
      <EmptyState
        title="No readiness report yet"
        description="Upload a resume and run analysis to unlock your dashboard."
        actionLabel="Go to Upload"
        onAction={() => setPage("upload")}
      />
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.kpiGrid}>
        <KpiCard label="Readiness Score" value={`${readiness}%`} hint="Estimated role fit" tone="blue" />
        <KpiCard
          label="Detected Skills"
          value={String(report.profile.skills.length)}
          hint="From resume parsing"
          tone="teal"
        />
        <KpiCard label="Priority Gaps" value={String(gaps.length)} hint="Highest impact missing skills" tone="amber" />
        <KpiCard
          label="Plan Horizon"
          value={`${report.seven_day_plan.length}d`}
          hint="Actionable weekly roadmap"
          tone="rose"
        />
      </div>

      <div className={styles.grid}>
        <Panel span={7} delay={1}>
          <div className={styles.head}>
            <h2>Role alignment</h2>
            <Chip>{report.target_role}</Chip>
          </div>
          <p className={styles.lead}>{match?.strengths?.[0] || "Match signal pending"}</p>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${readiness}%` }} />
          </div>
          <InsightList items={(match?.evidence || []).slice(0, 3)} />
        </Panel>

        <Panel span={5} delay={2}>
          <h2>Quick insights</h2>
          <InsightList
            compact
            items={[
              `Top gap: ${gaps[0] || "None critical"}`,
              `Skills mapped: ${report.profile.skills.join(", ") || "None"}`,
              `Required skills: ${report.explainability?.required_skills || "—"}`,
              `Report ID: ${report.report_id?.slice(0, 8) || "—"}`
            ]}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setPage("gaps")}>
              Review Gaps
            </Button>
            <Button variant="primary" onClick={() => setPage("plan")}>
              Open Plan
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
