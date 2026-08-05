import { useEffect, useState } from "react";
import { Chip } from "@/atoms/Chip";
import { Panel } from "@/atoms/Panel";
import { Text } from "@/atoms/Text";
import { getWorkspaceInsights } from "@/api/client";
import { KpiCard } from "@/molecules/KpiCard";
import { useAppState } from "@/state/AppState";
import type { WorkspaceInsights } from "@/types";
import styles from "./InsightsPage.module.scss";

export function InsightsPage() {
  const { setStatus } = useAppState();
  const [data, setData] = useState<WorkspaceInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const insights = await getWorkspaceInsights();
        if (active) setData(insights);
      } catch (error) {
        if (active) {
          setStatus(error instanceof Error ? error.message : "Failed to load workspace insights");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [setStatus]);

  const maxRole = Math.max(1, ...(data?.role_distribution.map((r) => r.count) || [1]));

  return (
    <div className={styles.stack}>
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Candidates"
          value={String(data?.candidate_count ?? (loading ? "…" : 0))}
          hint="Profiles in workspace"
          tone="blue"
        />
        <KpiCard
          label="Reports"
          value={String(data?.report_count ?? (loading ? "…" : 0))}
          hint="Total analyses stored"
          tone="teal"
        />
        <KpiCard
          label="Avg readiness"
          value={
            data?.average_readiness == null
              ? "—"
              : `${Math.round(data.average_readiness)}%`
          }
          hint="Across all reports"
          tone="amber"
        />
        <KpiCard
          label="Roles covered"
          value={String(data?.role_distribution.length ?? 0)}
          hint="Distinct IT tracks"
          tone="rose"
        />
      </div>

      <div className={styles.grid}>
        <Panel span={7}>
          <div className={styles.head}>
            <div>
              <span className={styles.kicker}>Institutional / workspace view</span>
              <h2>Role distribution</h2>
            </div>
            <Chip>{loading ? "Loading..." : "Live DB"}</Chip>
          </div>
          <Text muted tiny>
            Lightweight institutional dashboard for career centers — aggregates readiness across
            candidates without requiring university SSO.
          </Text>
          <div className={styles.roleList}>
            {(data?.role_distribution || []).map((role) => (
              <div className={styles.roleItem} key={role.role}>
                <div className={styles.roleTop}>
                  <strong>{role.role}</strong>
                  <span>{role.count}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(role.count / maxRole) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!data?.role_distribution?.length && !loading && (
              <Text muted>No reports yet — run analyses to populate workspace insights.</Text>
            )}
          </div>
        </Panel>

        <Panel span={5} delay={1}>
          <span className={styles.kicker}>Recent activity</span>
          <h2>Latest reports</h2>
          <div className={styles.recentList}>
            {(data?.recent_reports || []).map((item) => (
              <article className={styles.recentCard} key={item.report_id}>
                <div className={styles.recentHead}>
                  <strong>{item.readiness_score}%</strong>
                  <Chip>{item.target_role}</Chip>
                </div>
                <Text muted tiny>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                </Text>
                <Text muted tiny>
                  Gaps: {item.top_gaps.join(", ") || "None"}
                </Text>
              </article>
            ))}
            {!data?.recent_reports?.length && !loading && (
              <Text muted>No recent reports.</Text>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
