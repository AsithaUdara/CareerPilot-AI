import { useState } from "react";
import { Button } from "@/atoms/Button";
import { Panel } from "@/atoms/Panel";
import { Select } from "@/atoms/Select";
import { Text } from "@/atoms/Text";
import { analyzeCandidate, listReports, uploadResume } from "@/api/client";
import { FileDrop } from "@/molecules/FileDrop";
import { useAppState } from "@/state/AppState";
import type { AnalysisJobStatus } from "@/types";
import styles from "./UploadPage.module.scss";

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued on Celery",
  resume_analysis: "Resume Analysis Agent",
  job_matching: "Job Matching + RAG",
  skill_gaps: "Skill Gap Agent",
  learning_roadmap: "Learning Planner Agent",
  resume_optimization: "Resume Optimization Agent",
  interview_coach: "Interview Coach Agent",
  report_composition: "Report Composition",
  completed: "Completed",
  failed: "Failed"
};

export function UploadPage() {
  const {
    file,
    setFile,
    candidateId,
    setCandidateId,
    targetRole,
    setTargetRole,
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
      setStatus("Uploading resume...");
      const data = await uploadResume(file);
      setCandidateId(data.candidate_id);
      setStatus("Resume uploaded. Ready to analyze.");
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
      setStatus("Dispatching Celery analysis job...");
      const data = await analyzeCandidate(candidateId, targetRole, (progressJob) => {
        setJob(progressJob);
        setStatus(`${STAGE_LABELS[progressJob.stage] || progressJob.stage} (${progressJob.progress}%)`);
      });
      setReport(data);
      const saved = await listReports(candidateId);
      setReports(saved);
      setStatus("Analysis complete.");
      setPage("dashboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.grid}>
      <Panel span={8}>
        <h2>Resume intake</h2>
        <Text muted>
          Upload a resume, then dispatch an event-driven multi-agent pipeline via Celery (non-blocking).
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
            Run Async Analysis
          </Button>
        </div>
      </Panel>

      <Panel span={4} delay={1}>
        <h2>Pipeline status</h2>
        <ul className={styles.timeline}>
          <li className={file ? styles.done : ""}>Select resume</li>
          <li className={candidateId ? styles.done : ""}>Parse & store profile</li>
          <li className={job ? styles.done : ""}>Queue Celery job</li>
          <li className={job && job.progress >= 45 ? styles.done : ""}>Match + skill gaps</li>
          <li className={report ? styles.done : ""}>Compose readiness report</li>
        </ul>
        {job && (
          <>
            <Text muted tiny>
              Current stage
            </Text>
            <Text>
              {STAGE_LABELS[job.stage] || job.stage} — {job.progress}%
            </Text>
            <Text muted tiny>
              Job ID
            </Text>
            <Text mono>{job.job_id}</Text>
          </>
        )}
        <Text muted tiny>
          Candidate ID
        </Text>
        <Text mono>{candidateId || "—"}</Text>
      </Panel>
    </div>
  );
}
