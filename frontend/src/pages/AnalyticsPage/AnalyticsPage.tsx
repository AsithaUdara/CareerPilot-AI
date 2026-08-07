import { useEffect, useState } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { getCandidateAnalytics } from "@/api/client";
import { useAppState } from "@/state/AppState";
import type { CareerAnalytics } from "@/types";
import styles from "./AnalyticsPage.module.scss";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: string): string {
  if (status === "persistent") return "Persistent";
  if (status === "improving") return "Closed";
  if (status === "new") return "New";
  return "Current";
}

function ScoreSparkline({ scores }: { scores: number[] }) {
  if (scores.length === 0) return null;
  const width = 320;
  const height = 88;
  const pad = 8;
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const span = Math.max(max - min, 1);
  const points = scores.map((score, index) => {
    const x =
      scores.length === 1
        ? width / 2
        : pad + (index / (scores.length - 1)) * (width - pad * 2);
    const y = height - pad - ((score - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  const area = `${pad},${height - pad} ${polyline} ${width - pad},${height - pad}`;

  return (
    <svg className={styles.spark} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Readiness trend">
      <defs>
        <linearGradient id="analyticsSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f7aef" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1f7aef" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#analyticsSparkFill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#1f7aef"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((score, index) => {
        const [x, y] = points[index].split(",").map(Number);
        return <circle key={`${score}-${index}`} cx={x} cy={y} r="4.5" fill="#1559c5" />;
      })}
    </svg>
  );
}

export function AnalyticsPage() {
  const { candidateId, setPage, setStatus, setUploadStep } = useAppState();
  const [data, setData] = useState<CareerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!candidateId) return;
      try {
        setLoading(true);
        const analytics = await getCandidateAnalytics(candidateId);
        if (active) {
          setData(analytics);
          setStatus("Analysis ready.");
        }
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

  if (!candidateId) return null;

  const timeline = data?.timeline || [];
  const scores = timeline.map((p) => p.readiness_score);
  const gapFreq = data?.gap_frequency?.length
    ? data.gap_frequency
    : (data?.recurring_gaps || []).map((gap) => ({ gap, count: 1, status: "current" }));
  const maxGapCount = Math.max(1, ...gapFreq.map((g) => g.count));
  const delta = data?.score_delta;
  const singleRun = (data?.report_count || 0) <= 1;

  return (
    <div className={styles.page}>
      <section className={styles.insightCard}>
        <div>
          <p className={styles.kicker}>Progress insight</p>
          <h2 className={styles.insightTitle}>
            {loading ? "Loading analytics…" : data?.insight || "No analytics yet."}
          </h2>
        </div>
        <div className={styles.insightActions}>
          <Button
            variant="primary"
            onClick={() => {
              setUploadStep("review");
              setPage("upload");
            }}
          >
            Re-analyse
          </Button>
          <Button variant="secondary" onClick={() => setPage("gaps")}>
            Review gaps
          </Button>
        </div>
      </section>

      <div className={styles.stats}>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Latest score</span>
          <strong className={styles.statValue}>{data?.latest_score ?? "—"}</strong>
          <span className={styles.statHint}>{data?.latest_role || "Target role"}</span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Analyses</span>
          <strong className={styles.statValue}>{data?.report_count ?? (loading ? "…" : 0)}</strong>
          <span className={styles.statHint}>Saved for this CV</span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Score change</span>
          <strong
            className={`${styles.statValue} ${
              delta == null ? "" : delta >= 0 ? styles.up : styles.down
            }`}
          >
            {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}
          </strong>
          <span className={styles.statHint}>
            {singleRun ? "Need 2+ runs" : "First → latest"}
          </span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Best score</span>
          <strong className={styles.statValue}>{data?.best_score ?? "—"}</strong>
          <span className={styles.statHint}>
            Avg {data?.average_score != null ? data.average_score : "—"}
          </span>
        </article>
      </div>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Readiness trend</p>
              <h3 className={styles.sectionTitle}>Score over time</h3>
            </div>
            <span className={styles.pill}>{timeline.length} point{timeline.length === 1 ? "" : "s"}</span>
          </div>

          {timeline.length === 0 ? (
            <Text muted>Run an analysis to start your readiness timeline.</Text>
          ) : (
            <>
              <ScoreSparkline scores={scores} />
              <ol className={styles.timeline}>
                {timeline.map((point, index) => {
                  const prev = index > 0 ? timeline[index - 1].readiness_score : null;
                  const stepDelta = prev == null ? null : point.readiness_score - prev;
                  return (
                    <li key={point.report_id} className={styles.timelineItem}>
                      <div className={styles.timelineTop}>
                        <strong>{point.readiness_score}</strong>
                        <span>{point.target_role}</span>
                        <em>{formatDate(point.created_at)}</em>
                        {stepDelta != null && (
                          <span
                            className={`${styles.stepDelta} ${
                              stepDelta >= 0 ? styles.up : styles.down
                            }`}
                          >
                            {stepDelta >= 0 ? "+" : ""}
                            {stepDelta}
                          </span>
                        )}
                      </div>
                      {point.top_gaps.length > 0 && (
                        <p className={styles.timelineGaps}>
                          Focus: {point.top_gaps.slice(0, 2).join(" · ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Gap patterns</p>
              <h3 className={styles.sectionTitle}>What keeps showing up</h3>
            </div>
          </div>

          {gapFreq.length === 0 ? (
            <Text muted>No skill gaps tracked yet.</Text>
          ) : (
            <ul className={styles.gapList}>
              {gapFreq.map((item, index) => (
                <li key={`${item.gap}-${index}`} className={styles.gapItem}>
                  <div className={styles.gapTop}>
                    <span className={styles.gapRank}>{index + 1}</span>
                    <div className={styles.gapMeta}>
                      <strong title={item.gap}>{item.gap}</strong>
                      <span className={styles.gapStatus}>{statusLabel(item.status)}</span>
                    </div>
                    <em>{item.count}×</em>
                  </div>
                  <div className={styles.gapTrack} aria-hidden>
                    <span style={{ width: `${(item.count / maxGapCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Movement</p>
              <h3 className={styles.sectionTitle}>Closed vs new gaps</h3>
            </div>
          </div>
          {singleRun ? (
            <div className={styles.emptyNote}>
              <p>Progress compares your first and latest analysis.</p>
              <p>Re-analyse after practice to unlock closed and new gap tracking.</p>
            </div>
          ) : (
            <div className={styles.movement}>
              <div>
                <p className={styles.fieldLabel}>Closed</p>
                {(data?.closed_gaps || []).length === 0 ? (
                  <Text muted>None yet</Text>
                ) : (
                  <ul className={styles.simpleList}>
                    {data?.closed_gaps.slice(0, 5).map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className={styles.fieldLabel}>New</p>
                {(data?.new_gaps || []).length === 0 ? (
                  <Text muted>None</Text>
                ) : (
                  <ul className={styles.simpleList}>
                    {data?.new_gaps.slice(0, 5).map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Coverage</p>
              <h3 className={styles.sectionTitle}>Latest snapshot</h3>
            </div>
          </div>
          <div className={styles.coverage}>
            <div>
              <strong>{data?.skills_tracked ?? 0}</strong>
              <span>Skills tracked</span>
            </div>
            <div>
              <strong>{data?.matched_jobs ?? 0}</strong>
              <span>Matched jobs</span>
            </div>
            <div>
              <strong>{data?.next_focus?.length ?? 0}</strong>
              <span>Priority gaps</span>
            </div>
          </div>
          {(data?.roles_analyzed || []).length > 0 && (
            <div className={styles.roles}>
              <p className={styles.fieldLabel}>Roles analysed</p>
              <div className={styles.roleChips}>
                {data?.roles_analyzed.map((role) => (
                  <span key={role.role} className={styles.roleChip}>
                    {role.role} · {role.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
