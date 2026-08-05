import { useEffect, useState } from "react";
import { Chip } from "@/atoms/Chip";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getCandidateAnalytics } from "@/api/client";
import { EmptyState } from "@/molecules/EmptyState";
import { KpiCard } from "@/molecules/KpiCard";
import { useAppState } from "@/state/AppState";
import type { CareerAnalytics } from "@/types";
import styles from "./AnalyticsPage.module.scss";

export function AnalyticsPage() {
  const { candidateId, setPage, setStatus } = useAppState();
  const [data, setData] = useState<CareerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!candidateId) return;
      try {
        setLoading(true);
        const analytics = await getCandidateAnalytics(candidateId);
        if (active) setData(analytics);
      } catch (error) {
        if (active) {
          setStatus(error instanceof Error ? error.message : "Failed to load analytics");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [candidateId, setStatus]);

  if (!candidateId) {
    return (
      <EmptyState
        icon="📈"
        title="No analytics yet"
        description="Upload a resume and run at least one analysis to unlock long-term career analytics."
        actionLabel="Upload Resume"
        onAction={() => setPage("upload")}
      />
    );
  }

  const maxScore = Math.max(1, ...(data?.timeline.map((p) => p.readiness_score) || [1]));

  return (
    <div className={styles.stack}>
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Reports tracked"
          value={String(data?.report_count ?? (loading ? "…" : 0))}
          hint="Analyses for this candidate"
          tone="blue"
        />
        <KpiCard
          label="Score delta"
          value={
            data?.score_delta == null
              ? "—"
              : `${data.score_delta >= 0 ? "+" : ""}${data.score_delta}`
          }
          hint="First → latest readiness"
          tone={data && (data.score_delta || 0) >= 0 ? "teal" : "amber"}
        />
        <KpiCard
          label="Closed gaps"
          value={String(data?.closed_gaps.length ?? 0)}
          hint="Resolved since first report"
          tone="teal"
        />
        <KpiCard
          label="New gaps"
          value={String(data?.new_gaps.length ?? 0)}
          hint="Appeared in latest report"
          tone="rose"
        />
      </div>

      <div className={styles.grid}>
        <Panel span={8}>
          <div className={styles.head}>
            <div>
              <span className={styles.kicker}>Long-term career analytics</span>
              <h2>Readiness timeline</h2>
            </div>
            <Chip>{loading ? "Loading..." : `${data?.timeline.length || 0} points`}</Chip>
          </div>
          {!data?.timeline.length && <Text muted>Run multiple analyses to see trend lines.</Text>}
          <div className={styles.timeline}>
            {data?.timeline.map((point) => (
              <div className={styles.point} key={point.report_id}>
                <div className={styles.pointMeta}>
                  <strong>{point.readiness_score}%</strong>
                  <span>{point.target_role}</span>
                  <span className={styles.date}>
                    {point.created_at ? new Date(point.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(point.readiness_score / maxScore) * 100}%` }}
                  />
                </div>
                <Text muted tiny>
                  Gaps: {point.top_gaps.join(", ") || "None"}
                </Text>
              </div>
            ))}
          </div>
        </Panel>

        <Panel span={4} delay={1}>
          <span className={styles.kicker}>Patterns</span>
          <h2>Recurring gaps</h2>
          <div className={styles.pillRow}>
            {(data?.recurring_gaps || []).map((gap) => (
              <span className={styles.pill} key={gap}>
                {gap}
              </span>
            ))}
            {!data?.recurring_gaps?.length && <Text muted>No recurring gaps yet.</Text>}
          </div>
          <div className={styles.block}>
            <p className={styles.blockLabel}>Roles analyzed</p>
            {(data?.roles_analyzed || []).map((role) => (
              <div className={styles.roleRow} key={role.role}>
                <span>{role.role}</span>
                <Chip>{role.count}</Chip>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
