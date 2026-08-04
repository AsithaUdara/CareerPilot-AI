import type {
  AnalysisJobStatus,
  AnalyzeJobAccepted,
  CareerReadinessReport,
  ReportSummary,
  UploadResponse
} from "@/types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function uploadResume(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/resume/upload`, {
    method: "POST",
    body: formData
  });
  return parseJson<UploadResponse>(res);
}

export async function startAnalysis(
  candidateId: string,
  targetRole: string
): Promise<AnalyzeJobAccepted> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_id: candidateId, target_role: targetRole })
  });
  return parseJson<AnalyzeJobAccepted>(res);
}

export async function getJobStatus(jobId: string): Promise<AnalysisJobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  return parseJson<AnalysisJobStatus>(res);
}

export async function waitForAnalysisJob(
  jobId: string,
  onProgress?: (job: AnalysisJobStatus) => void,
  timeoutMs = 60000
): Promise<AnalysisJobStatus> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await getJobStatus(jobId);
    onProgress?.(job);
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  throw new Error("Timed out waiting for analysis job");
}

export async function analyzeCandidate(
  candidateId: string,
  targetRole: string,
  onProgress?: (job: AnalysisJobStatus) => void
): Promise<CareerReadinessReport> {
  const accepted = await startAnalysis(candidateId, targetRole);
  const job = await waitForAnalysisJob(accepted.job_id, onProgress);
  if (job.status === "failed") {
    throw new Error(job.error || "Analysis pipeline failed");
  }
  if (!job.report_id) {
    throw new Error("Job completed without report_id");
  }
  return getReport(job.report_id);
}

export async function listReports(candidateId: string): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/candidates/${candidateId}/reports`);
  return parseJson<ReportSummary[]>(res);
}

export async function getReport(reportId: string): Promise<CareerReadinessReport> {
  const res = await fetch(`${API_BASE}/reports/${reportId}`);
  return parseJson<CareerReadinessReport>(res);
}

export function getAgent(report: CareerReadinessReport | null, name: string) {
  return report?.agent_outputs?.find((agent) => agent.name === name) ?? null;
}

export function estimateReadiness(report: CareerReadinessReport | null): number {
  if (!report) return 0;
  const skills = report.profile?.skills?.length || 0;
  const gaps = getAgent(report, "SkillGapAgent")?.gaps?.length || 0;
  const base = Math.min(92, 48 + skills * 8);
  return Math.max(28, base - gaps * 8);
}
