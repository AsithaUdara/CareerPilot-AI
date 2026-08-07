import { useEffect, useState } from "react";
import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Select } from "@/atoms/Select";
import { Text } from "@/atoms/Text";
import { estimateReadiness, uploadResume } from "@/api/client";
import { IT_TARGET_ROLES, SENIORITY_LEVELS } from "@/constants/itRoles";
import { humanizeError } from "@/lib/errors";
import { FileDrop } from "@/molecules/FileDrop";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import styles from "./UploadPage.module.scss";

const PIPELINE_STAGES = [
  { key: "queued", label: "Queued", detail: "Job starts on the worker" },
  { key: "resume_analysis", label: "Resume analysis", detail: "Structure your profile" },
  { key: "job_matching", label: "Job matching", detail: "Live + curated roles" },
  { key: "skill_gaps", label: "Skill gaps", detail: "Rank what blocks hiring" },
  { key: "learning_roadmap", label: "Learning plan", detail: "Prioritized roadmap" },
  { key: "resume_optimization", label: "Resume tips", detail: "Role-targeted rewrites" },
  { key: "interview_coach", label: "Interview prep", detail: "Practice drills" },
  { key: "report_composition", label: "Final report", detail: "Explainable readiness" }
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

const STEPS = [
  { key: "intake", label: "Upload" },
  { key: "review", label: "Verify" },
  { key: "running", label: "Analyse" },
  { key: "done", label: "Done" }
] as const;

const HOW_STEPS = [
  { n: "1", title: "Upload", text: "Add your resume and choose a target role." },
  { n: "2", title: "Verify", text: "Confirm the extracted skills and experience." },
  { n: "3", title: "Analyse", text: "Six agents build your readiness report." }
];

const EXTRACT_PHASES = [
  { label: "Uploading file", tip: "Sending your resume securely to CareerPilot." },
  { label: "Reading document", tip: "Pulling text from PDF, DOCX, or TXT." },
  { label: "Checking it’s a CV", tip: "Confirming this looks like a resume, not notes." },
  { label: "Extracting profile", tip: "Finding skills, education, projects, and experience." },
  { label: "Almost ready", tip: "Preparing the verify step — usually 10–40 seconds total." }
];

function isNotResumeError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not look like a resume") ||
    lower.includes("little readable text") ||
    lower.includes("not a resume")
  );
}

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
    status,
    busy,
    setBusy,
    setPage,
    uploadStep,
    setUploadStep,
    analysisJob,
    analysisError,
    setAnalysisError,
    runAnalysis
  } = useAppState();

  const [showMore, setShowMore] = useState(
    () => stackEmphasis.length > 0 || Boolean(githubUrl || linkedinUrl)
  );
  const [extractPhase, setExtractPhase] = useState(0);

  const extracting = busy && uploadStep === "intake";

  useEffect(() => {
    if (!extracting) {
      setExtractPhase(0);
      return;
    }
    setExtractPhase(0);
    const id = window.setInterval(() => {
      setExtractPhase((prev) => Math.min(prev + 1, EXTRACT_PHASES.length - 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [extracting]);

  const job = analysisJob;
  const currentStageIndex = job
    ? PIPELINE_STAGES.findIndex((stage) => stage.key === job.stage)
    : -1;
  const jobComplete = job?.stage === "completed" || job?.status === "completed";
  const jobFailed = job?.stage === "failed" || job?.status === "failed";
  const locked = uploadStep === "running" || busy;
  const stepOrder = STEPS.map((s) => s.key);
  const stepIndex = stepOrder.indexOf(uploadStep);
  const notResumeError = uploadStep === "intake" && isNotResumeError(analysisError);
  const pipelineError = Boolean(analysisError) && !notResumeError;

  const onFileChange = (next: File | null) => {
    setFile(next);
    if (analysisError) setAnalysisError(null);
    if (notResumeError || isNotResumeError(status)) {
      setStatus("Ready to start");
    }
  };

  const onContinue = async () => {
    if (!file || locked) return;
    try {
      setBusy(true);
      setAnalysisError(null);
      setStatus("Uploading resume and extracting profile...");
      const data = await uploadResume(file, {
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim()
      });
      setCandidateId(data.candidate_id);
      if (data.profile) setProfile(data.profile);
      setUploadStep("review");
      setStatus("Profile ready — verify, then run analysis.");
    } catch (error) {
      const message = humanizeError(error);
      setAnalysisError(message);
      if (isNotResumeError(message)) {
        setStatus("Choose a resume or CV to continue.");
      } else {
        setStatus(message);
      }
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
  };

  return (
    <div className={styles.page}>
      <ol className={styles.steps} aria-label="Upload steps">
        {STEPS.map((step, index) => {
          const allComplete = uploadStep === "done";
          const active = uploadStep === step.key && !allComplete;
          const done = allComplete || stepIndex > index;
          return (
            <li
              key={step.key}
              className={`${styles.step} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
            >
              <span className={styles.stepNum}>{done ? "✓" : index + 1}</span>
              <span className={styles.stepLabel}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {pipelineError && (
        <div className={styles.errorBanner} role="alert">
          <p>{analysisError}</p>
          {candidateId && uploadStep !== "running" && uploadStep !== "intake" && (
            <Button variant="primary" onClick={() => void runAnalysis()} disabled={locked}>
              Retry
            </Button>
          )}
        </div>
      )}

      {uploadStep === "intake" && (
        <div className={styles.intake}>
          <Panel span={12} className={styles.mainCard}>
            <div className={styles.intakeHead}>
              <div>
                <p className={styles.kicker}>Step 1</p>
                <h2 className={styles.title}>
                  {extracting ? "Extracting your profile" : "Upload your resume"}
                </h2>
                <Text muted>
                  {extracting
                    ? "This can take a little while — stay on this page while we read your CV."
                    : "Drop a PDF, DOCX, or TXT. Next you will verify the extracted profile before agents run."}
                </Text>
              </div>
            </div>

            {extracting ? (
              <div className={styles.extractPanel} aria-live="polite" aria-busy="true">
                <div className={styles.extractHero}>
                  <div className={styles.extractSpinner} aria-hidden />
                  <div className={styles.extractCopy}>
                    <p className={styles.extractLabel}>{EXTRACT_PHASES[extractPhase].label}</p>
                    <p className={styles.extractTip}>{EXTRACT_PHASES[extractPhase].tip}</p>
                    {file?.name && (
                      <p className={styles.extractFile}>
                        Working on <strong>{file.name}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.extractTrack} aria-hidden>
                  <div
                    className={styles.extractFill}
                    style={{
                      width: `${18 + (extractPhase / (EXTRACT_PHASES.length - 1)) * 72}%`
                    }}
                  />
                </div>

                <ol className={styles.extractSteps}>
                  {EXTRACT_PHASES.map((phase, index) => {
                    const done = index < extractPhase;
                    const active = index === extractPhase;
                    return (
                      <li
                        key={phase.label}
                        className={`${styles.extractStep} ${done ? styles.extractStepDone : ""} ${active ? styles.extractStepActive : ""}`}
                      >
                        <span className={styles.extractStepMark}>
                          {done ? "✓" : active ? "●" : index + 1}
                        </span>
                        <span>{phase.label}</span>
                      </li>
                    );
                  })}
                </ol>

                <p className={styles.extractNote}>
                  Typical wait is about 10–40 seconds. You’ll review the result before any agents run.
                </p>
              </div>
            ) : (
              <div className={styles.intakePrimary}>
                <FileDrop fileName={file?.name} onChange={onFileChange} />

                <div className={styles.formRow}>
                  <Select
                    label="Target role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    options={[...IT_TARGET_ROLES]}
                    disabled={locked}
                  />
                  <Select
                    label="Seniority"
                    value={seniorityLevel}
                    onChange={(e) => setSeniorityLevel(e.target.value)}
                    options={[...SENIORITY_LEVELS]}
                    disabled={locked}
                  />
                </div>

                <button
                  type="button"
                  className={styles.moreToggle}
                  onClick={() => setShowMore((v) => !v)}
                >
                  <span className={styles.moreIcon}>{showMore ? "−" : "+"}</span>
                  <span>
                    {showMore ? "Hide optional details" : "Add stack, GitHub, or LinkedIn"}
                    {!showMore && <em> · optional</em>}
                  </span>
                </button>

                {showMore && (
                  <div className={styles.moreBlock}>
                    <div className={styles.stackBlock}>
                      <span className={styles.fieldLabel}>Stack emphasis</span>
                      <div className={styles.stackChips}>
                        {STACK_OPTIONS.map((option) => {
                          const active = stackEmphasis.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={locked}
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
                        <span className={styles.fieldLabel}>GitHub</span>
                        <input
                          className={styles.input}
                          type="url"
                          placeholder="https://github.com/…"
                          value={githubUrl}
                          disabled={locked}
                          onChange={(e) => setGithubUrl(e.target.value)}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>LinkedIn</span>
                        <input
                          className={styles.input}
                          type="url"
                          placeholder="https://linkedin.com/in/…"
                          value={linkedinUrl}
                          disabled={locked}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className={styles.actions}>
                  {notResumeError ? (
                    <div className={styles.inlineErrorRow}>
                      <p className={styles.inlineError} role="alert">
                        {analysisError}
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setAnalysisError(null);
                          setFile(null);
                          setStatus("Ready to start");
                          window.setTimeout(() => {
                            document.getElementById("resume-file")?.click();
                          }, 0);
                        }}
                      >
                        Reupload
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => void onContinue()}
                      disabled={!file || locked}
                    >
                      Continue to verify
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className={styles.infoPair}>
              <div className={styles.infoCard}>
                <p className={styles.kicker}>How it works</p>
                <h3 className={styles.sideTitle}>Three clear steps</h3>
                <ol className={styles.howList}>
                  {HOW_STEPS.map((item) => (
                    <li key={item.n}>
                      <span className={styles.howNum}>{item.n}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.kicker}>Tips</p>
                <h3 className={styles.sideTitle}>Get a better result</h3>
                <ul className={styles.tips}>
                  <li>Use your latest resume for better skill extraction.</li>
                  <li>Pick the role you are applying for now.</li>
                  <li>You can re-analyze later with a different role.</li>
                  <li>Optional stack tags help agents weight matching skills.</li>
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {uploadStep === "review" && profile && (
        <div className={styles.review}>
          <Panel span={12} className={styles.mainCard}>
            <div className={styles.reviewHead}>
              <p className={styles.kicker}>Step 2</p>
              <h2 className={styles.title}>Verify extracted profile</h2>
              <Text muted>Confirm this looks right, then start analysis.</Text>
            </div>

            {report && (
              <p className={styles.priorNote}>
                Prior score <strong>{estimateReadiness(report)}</strong> for {report.target_role}.
              </p>
            )}

            <div className={styles.preview}>
              <div className={styles.previewBlock}>
                <p className={styles.previewLabel}>Summary</p>
                <Text>{profile.summary || "No summary extracted."}</Text>
              </div>
              <div className={styles.previewBlock}>
                <p className={styles.previewLabel}>Skills</p>
                <TagList items={profile.skills} />
              </div>
              <div className={styles.previewGrid}>
                {profile.experience.length > 0 && (
                  <div className={styles.previewBlock}>
                    <p className={styles.previewLabel}>Experience</p>
                    <ul className={styles.bullets}>
                      {profile.experience.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.education.length > 0 && (
                  <div className={styles.previewBlock}>
                    <p className={styles.previewLabel}>Education</p>
                    <ul className={styles.bullets}>
                      {profile.education.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.analyzeBlock}>
              <p className={styles.kicker}>Ready to analyse</p>
              <h3 className={styles.sideTitle}>Choose role, then run</h3>
              <div className={styles.formRow}>
                <Select
                  label="Target role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  options={[...IT_TARGET_ROLES]}
                  disabled={locked}
                />
                <Select
                  label="Seniority"
                  value={seniorityLevel}
                  onChange={(e) => setSeniorityLevel(e.target.value)}
                  options={[...SENIORITY_LEVELS]}
                  disabled={locked}
                />
              </div>
              <div className={styles.analyzeActions}>
                <Button
                  variant="primary"
                  onClick={() => void runAnalysis()}
                  disabled={!candidateId || locked}
                >
                  Analyse
                </Button>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={backToIntake}
                  disabled={locked}
                >
                  Different resume
                </button>
              </div>

              <div className={styles.pipelineSimple}>
                <p className={styles.previewLabel}>Pipeline</p>
                <ol className={styles.pipelineFlow}>
                  {PIPELINE_STAGES.map((stage, index) => (
                    <li key={stage.key}>
                      <span className={styles.pipelineIndex}>{index + 1}</span>
                      <span className={styles.pipelineLabel}>{stage.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {uploadStep === "review" && !profile && (
        <Panel span={12} className={styles.mainCard}>
          <Text muted>No profile loaded yet.</Text>
          <div className={styles.actions}>
            <Button variant="primary" onClick={backToIntake}>
              Back to upload
            </Button>
          </div>
        </Panel>
      )}

      {uploadStep === "running" && (
        <div className={styles.quest}>
          <Panel span={12} className={styles.mainCard}>
            <div className={styles.questHead}>
              <div>
                <p className={styles.kicker}>Step 3 · Agent quest</p>
                <h2 className={styles.title}>Agents are working</h2>
                <Text muted>
                  Watch each agent clear a stage. You can browse other pages — progress is saved.
                </Text>
              </div>
              {job && (
                <div className={styles.questScore}>
                  <span className={styles.questScoreValue}>{job.progress}%</span>
                  <span className={styles.questScoreLabel}>complete</span>
                </div>
              )}
            </div>

            {job && (
              <div className={styles.questBarWrap}>
                <div className={styles.questBarTrack}>
                  <div
                    className={styles.questBarFill}
                    style={{ width: `${Math.max(job.progress, 4)}%` }}
                  />
                </div>
                <p className={styles.questMessage}>
                  {job.message || "Starting the multi-agent pipeline…"}
                </p>
              </div>
            )}

            <ol className={styles.questGrid} aria-label="Analysis pipeline">
              {PIPELINE_STAGES.map((stage, index) => {
                const done = jobComplete || (currentStageIndex > -1 && index < currentStageIndex);
                const active = !jobComplete && !jobFailed && index === currentStageIndex;
                const lockedStage = !done && !active;
                return (
                  <li
                    key={stage.key}
                    className={`${styles.questCard} ${done ? styles.questCardDone : ""} ${active ? styles.questCardActive : ""} ${lockedStage ? styles.questCardLocked : ""}`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className={styles.questCardTop}>
                      <span className={styles.questBadge}>
                        {done ? "✓" : active ? "◆" : index + 1}
                      </span>
                      {active && <span className={styles.questPulse}>Live</span>}
                      {done && <span className={styles.questCleared}>Cleared</span>}
                    </div>
                    <strong className={styles.questTitle}>{stage.label}</strong>
                    <p className={styles.questDetail}>
                      {active && job?.message ? job.message : stage.detail}
                    </p>
                    {active && <div className={styles.questShine} aria-hidden />}
                  </li>
                );
              })}
            </ol>

            <div className={styles.questFoot}>
              <p>
                Next unlocks: readiness score, matched jobs, skill gaps, and your 7-day hiring sprint.
              </p>
            </div>
          </Panel>
        </div>
      )}

      {uploadStep === "done" && report && (
        <div className={styles.done}>
          <Panel span={12} className={styles.mainCard}>
            <div className={styles.doneHero}>
              <div className={styles.scoreRing}>
                <span>{estimateReadiness(report)}</span>
                <small>score</small>
              </div>
              <div className={styles.doneCopy}>
                <p className={styles.kicker}>Step 4</p>
                <h2 className={styles.title}>Analysis complete</h2>
                <Text muted>
                  Your report for <strong>{report.target_role}</strong>
                  {report.seniority_level ? ` · ${report.seniority_level}` : ""} is ready. Open
                  Analysis to see your score, skill gaps, and next steps.
                </Text>
                <div className={styles.analyzeActions}>
                  <Button variant="primary" onClick={() => setPage("dashboard")}>
                    See your results — Open Analysis
                  </Button>
                  <Button variant="secondary" onClick={analyzeAgain}>
                    Re-analyse
                  </Button>
                  <button type="button" className={styles.textLink} onClick={backToIntake}>
                    Upload new resume
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
