import { Button } from "@/atoms/Button";
import { Chip } from "@/atoms/Chip";
import { Text } from "@/atoms/Text";
import { estimateReadiness, getAgent } from "@/api/client";
import { useAppState } from "@/state/AppState";
import styles from "./DashboardPage.module.scss";

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

export function DashboardPage() {
  const { report, setPage, setUploadStep, profile, targetRole, seniorityLevel } = useAppState();

  if (!report) return null;

  const readiness = estimateReadiness(report);
  const gaps = getAgent(report, "SkillGapAgent")?.gaps || [];
  const match = getAgent(report, "JobMatchingAgent");
  const jobs = report.matched_jobs || [];
  const ringOffset = RING_CIRCUMFERENCE * (1 - readiness / 100);
  const role = report.target_role || targetRole;
  const level = report.seniority_level || seniorityLevel;
  const verdict =
    report.explainability?.decision_note ||
    match?.strengths?.[0] ||
    "Your analysis is ready. Review gaps and matched roles to plan your next move.";

  const goUploadNew = () => {
    setUploadStep("intake");
    setPage("upload");
  };

  return (
    <div className={styles.stack}>
      <section className={styles.hero}>
        <div className={styles.ringWrap} aria-hidden>
          <svg viewBox="0 0 120 120" className={styles.ring}>
            <defs>
              <linearGradient id="overviewScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1f7aef" />
                <stop offset="55%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#12a39a" />
              </linearGradient>
            </defs>
            <circle className={styles.ringTrack} cx="60" cy="60" r="52" />
            <circle
              className={styles.ringFill}
              cx="60"
              cy="60"
              r="52"
              stroke="url(#overviewScoreGrad)"
              strokeDasharray={RING_CIRCUMFERENCE}
              style={{ strokeDashoffset: ringOffset }}
            />
          </svg>
          <div className={styles.ringValue}>
            <strong>{readiness}</strong>
            <span>out of 100</span>
          </div>
        </div>

        <div className={styles.heroBody}>
          <p className={styles.kicker}>Readiness score</p>
          <h2 className={styles.heroTitle}>
            {role}
            {level ? <span> · {level}</span> : null}
          </h2>
          <p className={styles.verdict}>{verdict}</p>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${readiness}%` }} />
          </div>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={() => setPage("readiness")}>
              Open Readiness
            </Button>
            <Button variant="secondary" onClick={() => setPage("gaps")}>
              Review skill gaps
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setUploadStep("review");
                setPage("upload");
              }}
            >
              Re-analyse
            </Button>
            <Button variant="secondary" onClick={goUploadNew}>
              Upload new CV
            </Button>
          </div>
        </div>
      </section>

      <div className={styles.stats}>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Skills found</span>
          <strong className={styles.statValue}>{report.profile.skills.length}</strong>
          <span className={styles.statHint}>From your resume</span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Priority gaps</span>
          <strong className={styles.statValue}>{gaps.length}</strong>
          <span className={styles.statHint}>{gaps.length ? "Highest impact first" : "None flagged"}</span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Matched jobs</span>
          <strong className={styles.statValue}>{jobs.length}</strong>
          <span className={styles.statHint}>{report.job_source || "curated"} source</span>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Experience lines</span>
          <strong className={styles.statValue}>{profile?.experience?.length ?? 0}</strong>
          <span className={styles.statHint}>Parsed from CV</span>
        </article>
      </div>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Focus areas</p>
              <h3 className={styles.sectionTitle}>Priority skill gaps</h3>
            </div>
            <Button variant="secondary" onClick={() => setPage("gaps")}>
              Full gaps report
            </Button>
          </div>
          {gaps.length === 0 ? (
            <Text muted>No priority gaps were flagged for this role.</Text>
          ) : (
            <ol className={styles.gapList}>
              {gaps.slice(0, 5).map((gap, index) => (
                <li key={gap} className={styles.gapItem}>
                  <span className={styles.gapNum}>{index + 1}</span>
                  <div>
                    <strong>{gap}</strong>
                    {index === 0 && <p>Highest impact — start here.</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Recommended path</p>
              <h3 className={styles.sectionTitle}>What to do next</h3>
            </div>
          </div>
          <div className={styles.nextList}>
            <button type="button" className={styles.nextCard} onClick={() => setPage("readiness")}>
              <span className={styles.nextIcon}>◎</span>
              <span>
                <strong>Readiness detail</strong>
                <em>Evidence behind your score and role fit</em>
              </span>
            </button>
            <button type="button" className={styles.nextCard} onClick={() => setPage("gaps")}>
              <span className={styles.nextIcon}>☰</span>
              <span>
                <strong>Close skill gaps</strong>
                <em>{gaps[0] ? `Start with ${gaps[0]}` : "See the learning roadmap"}</em>
              </span>
            </button>
            <button type="button" className={styles.nextCard} onClick={() => setPage("plan")}>
              <span className={styles.nextIcon}>◷</span>
              <span>
                <strong>Hiring sprint</strong>
                <em>7-day plan and interview drills</em>
              </span>
            </button>
            <button type="button" className={styles.nextCard} onClick={() => setPage("mentor")}>
              <span className={styles.nextIcon}>✦</span>
              <span>
                <strong>Ask AI Mentor</strong>
                <em>Coaching grounded in this report</em>
              </span>
            </button>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Opportunities</p>
            <h3 className={styles.sectionTitle}>Top job matches</h3>
          </div>
          <Chip>{report.job_source || "curated"}</Chip>
        </div>
        {jobs.length === 0 ? (
          <Text muted>No job matches returned for this run.</Text>
        ) : (
          <div className={styles.jobList}>
            {jobs.slice(0, 4).map((job) => (
              <article className={styles.jobCard} key={job.id}>
                <div className={styles.jobHead}>
                  <h4>{job.label}</h4>
                  {typeof job.match_score === "number" && (
                    <span className={styles.matchBadge}>{Math.round(job.match_score * 100)}% match</span>
                  )}
                </div>
                <p className={styles.jobMeta}>
                  {job.company || "Company n/a"} · {job.source}
                </p>
                <p className={styles.jobSnippet}>
                  {job.description_snippet || "No description snippet."}
                </p>
                {job.required_skills?.length > 0 && (
                  <div className={styles.skillRow}>
                    {job.required_skills.slice(0, 5).map((skill) => (
                      <span className={styles.skillChip} key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {job.url ? (
                  <a className={styles.jobLink} href={job.url} target="_blank" rel="noreferrer">
                    Open listing →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
