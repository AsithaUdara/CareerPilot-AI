import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Select } from "@/atoms/Select";
import { Text } from "@/atoms/Text";
import { estimateReadiness, getProfile, uploadResume } from "@/api/client";
import { IT_TARGET_ROLES, SENIORITY_LEVELS } from "@/constants/itRoles";
import { humanizeError } from "@/lib/errors";
import { FileDrop } from "@/molecules/FileDrop";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./UploadPage.module.scss";

const PIPELINE_STAGES = [
  { key: "queued", icon: "⏳", label: "Queued", detail: "Job dispatched to Celery worker" },
  { key: "resume_analysis", icon: "🧠", label: "Resume Analysis", detail: "Gemini structures your profile" },
  { key: "job_matching", icon: "🎯", label: "Job Matching", detail: "Live Adzuna + curated RAG jobs" },
  { key: "skill_gaps", icon: "🧩", label: "Skill Gaps", detail: "Ranking blocking skills" },
  { key: "learning_roadmap", icon: "🗺️", label: "Learning Planner", detail: "Prioritized roadmap" },
  { key: "resume_optimization", icon: "📄", label: "Resume Optimizer", detail: "Role-targeted rewrites" },
  { key: "interview_coach", icon: "🎤", label: "Interview Coach", detail: "Personalized prep drills" },
  { key: "report_composition", icon: "📊", label: "Report Composition", detail: "Explainable final report" }
];

const STACK_OPTIONS = [
  "Python/FastAPI",
  "Node.js/Express",
  "React/TypeScript",
  "SQL/PostgreSQL",
  "Docker/Kubernetes",
  "AWS/Cloud",
  "Testing/QA Automation",
  "Data Pipelines/Spark",
  "Mobile (React Native/Flutter)"
];

const STEP_META = {
  intake: { label: "1 · Intake", title: "Upload your resume" },
  review: { label: "2 · Verify", title: "Review extracted profile" },
  running: { label: "3 · Analyze", title: "Agents are working" },
  done: { label: "4 · Ready", title: "Analysis complete" }
} as const;

export function UploadPage() {
  const {
    file,
    setFile,
    candidateId,
    setCandidateId,
    targetRole,
    setTargetRole,
    seniorityLevel,
    setSeniorityLevel,
    stackEmphasis,
    setStackEmphasis,
    githubUrl,
    setGithubUrl,
    linkedinUrl,
    setLinkedinUrl,
    profile,
    setProfile,
    report,
    setStatus,
    busy,
    setBusy,
    setPage,
    uploadStep,
    setUploadStep,
    analysisJob,
    analysisError,
    setAnalysisError,
    runAnalysis,
    myCandidates,
    authUser,
    refreshMyCandidates
  } = useAppState();

  const job = analysisJob;
  const currentStageIndex = job
    ? PIPELINE_STAGES.findIndex((stage) => stage.key === job.stage)
    : -1;
  const jobComplete = job?.stage === "completed" || job?.status === "completed";
  const jobFailed = job?.stage === "failed" || job?.status === "failed";
  const isRunning = uploadStep === "running";
  const locked = isRunning || busy;

  const onContinue = async () => {
    if (!file || locked) return;
    try {
      setBusy(true);
      setAnalysisError(null);
      setStatus("Uploading resume and extracting structured profile...");
      const data = await uploadResume(file, {
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim()
      });
      setCandidateId(data.candidate_id);
      if (data.profile) setProfile(data.profile);
      setUploadStep("review");
      setStatus("Profile extracted — verify details, then run analysis.");
      void refreshMyCandidates();
    } catch (error) {
      const message = humanizeError(error);
      setAnalysisError(message);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const selectSavedCv = async (id: string) => {
    if (locked) return;
    try {
      setBusy(true);
      setAnalysisError(null);
      setStatus("Loading saved CV summary...");
      const loaded = await getProfile(id);
      setCandidateId(id);
      setProfile(loaded);
      if (loaded.github_url) setGithubUrl(loaded.github_url);
      if (loaded.linkedin_url) setLinkedinUrl(loaded.linkedin_url);
      setFile(null);
      setUploadStep("review");
      setStatus("Loaded saved CV — verify target role, then run analysis.");
    } catch (error) {
      const message = humanizeError(error);
      setAnalysisError(message);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const backToIntake = () => {
    if (locked) return;
    setUploadStep("intake");
    setAnalysisError(null);
  };

  const analyzeAgain = () => {
    if (locked) return;
    setUploadStep("review");
    setAnalysisError(null);
    setStatus("Adjust role or stack, then run analysis again.");
  };

  return (
    <div className={styles.grid}>
      <div className={styles.stepper} aria-label="Upload steps">
        {(Object.keys(STEP_META) as Array<keyof typeof STEP_META>).map((key) => {
          const active = uploadStep === key;
          const order = ["intake", "review", "running", "done"] as const;
          const done =
            order.indexOf(uploadStep) > order.indexOf(key) ||
            (uploadStep === "done" && key === "done");
          return (
            <div
              key={key}
              className={`${styles.stepPill} ${active ? styles.stepPillActive : ""} ${done && !active ? styles.stepPillDone : ""}`}
            >
              {STEP_META[key].label}
            </div>
          );
        })}
      </div>

      {analysisError && (
        <div className={styles.errorBanner} role="alert">
          <div>
            <p className={styles.errorTitle}>Something needs attention</p>
            <Text muted>{analysisError}</Text>
          </div>
          {(uploadStep === "review" || uploadStep === "intake") && candidateId && (
            <Button variant="primary" onClick={() => void runAnalysis()} disabled={locked}>
              Retry analysis
            </Button>
          )}
        </div>
      )}

      {uploadStep === "intake" && (
        <>
          <Panel span={8}>
            <span className={styles.kicker}>{STEP_META.intake.label}</span>
            <h2>{STEP_META.intake.title}</h2>
            <Text muted>
              Choose a resume and target settings. Next you will review the extracted profile before
              any agents run.
            </Text>
            <FileDrop fileName={file?.name} onChange={setFile} />
            <TargetFields
              targetRole={targetRole}
              setTargetRole={setTargetRole}
              seniorityLevel={seniorityLevel}
              setSeniorityLevel={setSeniorityLevel}
              stackEmphasis={stackEmphasis}
              setStackEmphasis={setStackEmphasis}
              githubUrl={githubUrl}
              setGithubUrl={setGithubUrl}
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              disabled={locked}
            />
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => void onContinue()} disabled={!file || locked}>
                {busy ? "Extracting profile..." : "Continue to review"}
              </Button>
            </div>
          </Panel>
          <Panel span={4} delay={1}>
            <span className={styles.kicker}>What happens next</span>
            <h2>Verify, then run</h2>
            <ol className={styles.howto}>
              <li>We parse your resume into a structured profile.</li>
              <li>You check skills, experience, and target role.</li>
              <li>Only then do the six agents start working.</li>
            </ol>
            {authUser && myCandidates.length > 0 && (
              <div className={styles.savedBlock}>
                <p className={styles.metaLabel}>My CV summaries</p>
                <ul className={styles.savedList}>
                  {myCandidates.slice(0, 5).map((cv) => (
                    <li key={cv.candidate_id}>
                      <button
                        type="button"
                        className={styles.savedItem}
                        onClick={() => void selectSavedCv(cv.candidate_id)}
                        disabled={locked}
                      >
                        <strong>{cv.filename}</strong>
                        <span>{cv.summary.slice(0, 80) || "No summary"}…</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!authUser && (
              <Text muted>
                Sign in with Google (top bar) to save CV summaries across sessions.
              </Text>
            )}
          </Panel>
        </>
      )}

      {uploadStep === "review" && profile && (
        <>
          <Panel span={8}>
            <span className={styles.kicker}>{STEP_META.review.label}</span>
            <h2>{STEP_META.review.title}</h2>
            <Text muted>
              Confirm this looks right. You can still change role, seniority, and stack before
              analysis.
            </Text>
            {report && (
              <div className={styles.priorNote}>
                Prior readiness score: <strong>{estimateReadiness(report)}</strong> for{" "}
                {report.target_role}. Re-running keeps memory of prior gaps.
              </div>
            )}
            <TargetFields
              targetRole={targetRole}
              setTargetRole={setTargetRole}
              seniorityLevel={seniorityLevel}
              setSeniorityLevel={setSeniorityLevel}
              stackEmphasis={stackEmphasis}
              setStackEmphasis={setStackEmphasis}
              githubUrl={githubUrl}
              setGithubUrl={setGithubUrl}
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              disabled={locked}
            />
            <div className={styles.preview}>
              <span className={styles.kicker}>Extracted profile</span>
              <div className={styles.previewBlock}>
                <p className={styles.previewLabel}>Summary</p>
                <Text>{profile.summary || "No summary extracted."}</Text>
              </div>
              <div className={styles.previewBlock}>
                <p className={styles.previewLabel}>Skills</p>
                <TagList items={profile.skills} />
              </div>
              {profile.education.length > 0 && (
                <div className={styles.previewBlock}>
                  <p className={styles.previewLabel}>Education</p>
                  <ul className={styles.bullets}>
                    {profile.education.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.experience.length > 0 && (
                <div className={styles.previewBlock}>
                  <p className={styles.previewLabel}>Experience</p>
                  <ul className={styles.bullets}>
                    {profile.experience.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.projects.length > 0 && (
                <div className={styles.previewBlock}>
                  <p className={styles.previewLabel}>Projects</p>
                  <ul className={styles.bullets}>
                    {profile.projects.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={backToIntake} disabled={locked}>
                Upload different resume
              </Button>
              <Button variant="primary" onClick={() => void runAnalysis()} disabled={!candidateId || locked}>
                {report ? "Analyze again" : "Run multi-agent analysis"}
              </Button>
            </div>
          </Panel>
          <Panel span={4} delay={1}>
            <span className={styles.kicker}>Ready to analyze</span>
            <h2>What the agents will do</h2>
            <ul className={styles.pipeline}>
              {PIPELINE_STAGES.map((stage) => (
                <li key={stage.key} className={styles.stage}>
                  <span className={styles.stageIcon}>{stage.icon}</span>
                  <div>
                    <p className={styles.stageName}>{stage.label}</p>
                    <p className={styles.stageDetail}>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.meta}>
              <p className={styles.metaLabel}>Candidate ID</p>
              <Text mono>{candidateId ? candidateId.slice(0, 13) : "—"}</Text>
            </div>
          </Panel>
        </>
      )}

      {uploadStep === "running" && (
        <Panel span={12}>
          <span className={styles.kicker}>{STEP_META.running.label}</span>
          <h2>{STEP_META.running.title}</h2>
          <Text muted>
            Stay on this page or browse other sections — progress is tracked globally. Do not close
            the browser if you want live updates; a refresh will reconnect to the job.
          </Text>
          {job && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
              </div>
              <span className={styles.progressPct}>{job.progress}%</span>
            </div>
          )}
          <ul className={`${styles.pipeline} ${styles.pipelineWide}`}>
            {PIPELINE_STAGES.map((stage, index) => {
              const done = jobComplete || (currentStageIndex > -1 && index < currentStageIndex);
              const active = !jobComplete && !jobFailed && index === currentStageIndex;
              return (
                <li
                  key={stage.key}
                  className={`${styles.stage} ${done ? styles.stageDone : ""} ${active ? styles.stageActive : ""} ${jobFailed && index === currentStageIndex ? styles.stageFailed : ""}`}
                >
                  <span className={styles.stageIcon}>{done ? "✓" : stage.icon}</span>
                  <div>
                    <p className={styles.stageName}>{stage.label}</p>
                    <p className={styles.stageDetail}>
                      {active && job ? job.message || stage.detail : stage.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className={styles.metaRow}>
            <div>
              <p className={styles.metaLabel}>Candidate</p>
              <Text mono>{candidateId.slice(0, 13)}</Text>
            </div>
            {job && (
              <div>
                <p className={styles.metaLabel}>Job</p>
                <Text mono>{job.job_id.slice(0, 13)}</Text>
              </div>
            )}
          </div>
        </Panel>
      )}

      {uploadStep === "done" && report && (
        <Panel span={12}>
          <span className={styles.kicker}>{STEP_META.done.label}</span>
          <h2>{STEP_META.done.title}</h2>
          <div className={styles.doneHero}>
            <div className={styles.scoreRing}>
              <span>{estimateReadiness(report)}</span>
              <small>readiness</small>
            </div>
            <div>
              <Text>
                Report ready for <strong>{report.target_role}</strong>
                {report.seniority_level ? ` · ${report.seniority_level}` : ""}.
              </Text>
              <Text muted>
                Job source: {report.job_source || "curated"}. Open the dashboard for gaps, sprint, and
                interview prep — or analyze again with a different role.
              </Text>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => setPage("dashboard")}>
                  Open dashboard
                </Button>
                <Button variant="secondary" onClick={analyzeAgain}>
                  Analyze again
                </Button>
                <Button variant="secondary" onClick={backToIntake}>
                  New resume
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {uploadStep === "review" && !profile && (
        <Panel span={12}>
          <Text muted>No profile loaded. Upload a resume to continue.</Text>
          <div className={styles.actions}>
            <Button variant="primary" onClick={backToIntake}>
              Back to intake
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

type TargetFieldsProps = {
  targetRole: string;
  setTargetRole: (v: string) => void;
  seniorityLevel: string;
  setSeniorityLevel: (v: string) => void;
  stackEmphasis: string[];
  setStackEmphasis: (v: string[]) => void;
  githubUrl: string;
  setGithubUrl: (v: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (v: string) => void;
  disabled?: boolean;
};

function TargetFields({
  targetRole,
  setTargetRole,
  seniorityLevel,
  setSeniorityLevel,
  stackEmphasis,
  setStackEmphasis,
  githubUrl,
  setGithubUrl,
  linkedinUrl,
  setLinkedinUrl,
  disabled
}: TargetFieldsProps) {
  return (
    <>
      <div className={styles.formRow}>
        <Select
          label="Target IT role"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          options={[...IT_TARGET_ROLES]}
          disabled={disabled}
        />
        <Select
          label="Seniority level"
          value={seniorityLevel}
          onChange={(e) => setSeniorityLevel(e.target.value)}
          options={[...SENIORITY_LEVELS]}
          disabled={disabled}
        />
      </div>
      <div className={styles.stackBlock}>
        <span className={styles.fieldLabel}>Stack emphasis (optional)</span>
        <div className={styles.stackChips}>
          {STACK_OPTIONS.map((option) => {
            const active = stackEmphasis.includes(option);
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                className={`${styles.stackChip} ${active ? styles.stackChipActive : ""}`}
                onClick={() =>
                  setStackEmphasis(
                    active
                      ? stackEmphasis.filter((item) => item !== option)
                      : [...stackEmphasis, option].slice(0, 5)
                  )
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>GitHub URL (optional)</span>
          <input
            className={styles.input}
            type="url"
            placeholder="https://github.com/yourusername"
            value={githubUrl}
            disabled={disabled}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>LinkedIn URL (optional)</span>
          <input
            className={styles.input}
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedinUrl}
            disabled={disabled}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
        </label>
      </div>
    </>
  );
}
