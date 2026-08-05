import { useState } from "react";
import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Select } from "@/atoms/Select";
import { Text } from "@/atoms/Text";
import { analyzeCandidate, listReports, uploadResume } from "@/api/client";
import { FileDrop } from "@/molecules/FileDrop";
import { TagList } from "@/molecules/TagList";
import { useAppState } from "@/state/AppState";
import type { AnalysisJobStatus } from "@/types";
import styles from "./UploadPage.module.scss";

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued on Celery",
  resume_analysis: "Resume Analysis Agent (Gemini)",
  job_matching: "Job Matching — Adzuna + curated RAG",
  skill_gaps: "Skill Gap Agent",
  learning_roadmap: "Learning Planner Agent",
  resume_optimization: "Resume Optimization Agent",
  interview_coach: "Interview Coach Agent",
  report_composition: "Report Composition",
  completed: "Completed",
  failed: "Failed"
};

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

export function UploadPage() {
  const {
    file,
    setFile,
    candidateId,
    setCandidateId,
    targetRole,
    setTargetRole,
    profile,
    setProfile,
    report,
    setReport,
    setReports,
    setStatus,
    busy,
    setBusy,
    setPage
  } = useAppState();
  const [job, setJob] = useState<AnalysisJobStatus | null>(null);

  const onUpload = async () => {
    if (!file || busy) return;
    try {
      setBusy(true);
      setStatus("Uploading resume and extracting structured profile...");
      const data = await uploadResume(file);
      setCandidateId(data.candidate_id);
      if (data.profile) setProfile(data.profile);
      setStatus("Resume uploaded. Review the extracted profile, then run analysis.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onAnalyze = async () => {
    if (!candidateId || busy) return;
    try {
      setBusy(true);
      setStatus("Dispatching multi-agent analysis job...");
      const data = await analyzeCandidate(candidateId, targetRole, (progressJob) => {
        setJob(progressJob);
        setStatus(
          `${STAGE_LABELS[progressJob.stage] || progressJob.stage} (${progressJob.progress}%)`
        );
      });
      setReport(data);
      setProfile(data.profile);
      const saved = await listReports(candidateId);
      setReports(saved);
      setStatus(
        data.job_source === "live" || data.job_source === "live+curated"
          ? `Analysis complete using ${data.job_source} job source.`
          : "Analysis complete using curated real job descriptions (Adzuna unavailable)."
      );
      setPage("dashboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const currentStageIndex = job
    ? PIPELINE_STAGES.findIndex((stage) => stage.key === job.stage)
    : -1;
  const isComplete = Boolean(report) || job?.stage === "completed";

  return (
    <div className={styles.grid}>
      <Panel span={8}>
        <span className={styles.kicker}>Step 1 — Intake</span>
        <h2>Resume intake</h2>
        <Text muted>
          Upload a real resume. Gemini structures your profile, then a LangGraph multi-agent
          pipeline matches live jobs, gaps, learning, and interview prep.
        </Text>
        <FileDrop fileName={file?.name} onChange={setFile} />
        <Select
          label="Target role"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          options={["Backend Developer", "Frontend Developer", "Data Analyst"]}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onUpload} disabled={!file || busy}>
            Upload Resume
          </Button>
          <Button variant="primary" onClick={onAnalyze} disabled={!candidateId || busy}>
            {busy && job ? "Agents working..." : "Run Multi-Agent Analysis"}
          </Button>
        </div>

        {profile && (
          <div className={styles.preview}>
            <span className={styles.kicker}>Extracted by Resume Analysis Agent</span>
            <h3>Structured profile</h3>
            <div className={styles.previewBlock}>
              <p className={styles.previewLabel}>Summary</p>
              <Text>{profile.summary}</Text>
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
        )}
      </Panel>

      <Panel span={4} delay={1}>
        <span className={styles.kicker}>Step 2 — Orchestration</span>
        <h2>Agent pipeline</h2>
        {job && !isComplete && (
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
            </div>
            <span className={styles.progressPct}>{job.progress}%</span>
          </div>
        )}
        <ul className={styles.pipeline}>
          {PIPELINE_STAGES.map((stage, index) => {
            const done = isComplete || (currentStageIndex > -1 && index < currentStageIndex);
            const active = !isComplete && index === currentStageIndex;
            return (
              <li
                key={stage.key}
                className={`${styles.stage} ${done ? styles.stageDone : ""} ${active ? styles.stageActive : ""}`}
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
        <div className={styles.meta}>
          <div>
            <p className={styles.metaLabel}>Candidate ID</p>
            <Text mono>{candidateId ? candidateId.slice(0, 13) : "—"}</Text>
          </div>
          {job && (
            <div>
              <p className={styles.metaLabel}>Job ID</p>
              <Text mono>{job.job_id.slice(0, 13)}</Text>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
