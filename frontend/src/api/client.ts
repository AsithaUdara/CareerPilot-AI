import { loadAuth } from "@/lib/authStorage";
import { humanizeError } from "@/lib/errors";
import type {
  AnalysisJobStatus,
  AnalyzeJobAccepted,
  AuthUser,
  CandidateProfile,
  CandidateSummary,
  CareerAnalytics,
  CareerReadinessReport,
  MentorChatMessage,
  MentorChatResponse,
  ReportSummary,
  UploadResponse,
  WorkspaceInsights
} from "@/types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  const auth = loadAuth();
  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string | { msg?: string }[] };
      if (typeof body?.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
        detail = body.detail[0].msg;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(humanizeError(detail), res.status);
  }
  return res.json() as Promise<T>;
}

export async function signInWithGoogle(idToken: string): Promise<{ access_token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken })
  });
  return parseJson(res);
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  return parseJson(res);
}

export async function listMyCandidates(): Promise<CandidateSummary[]> {
  const res = await fetch(`${API_BASE}/me/candidates`, { headers: authHeaders() });
  return parseJson(res);
}

export async function listMyReports(): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/me/reports`, { headers: authHeaders() });
  return parseJson(res);
}

export async function uploadResume(
  file: File,
  options?: { githubUrl?: string; linkedinUrl?: string }
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.githubUrl) formData.append("github_url", options.githubUrl);
  if (options?.linkedinUrl) formData.append("linkedin_url", options.linkedinUrl);
  const res = await fetch(`${API_BASE}/resume/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });
  return parseJson<UploadResponse>(res);
}

export async function getProfile(candidateId: string): Promise<CandidateProfile> {
  const res = await fetch(`${API_BASE}/candidates/${candidateId}/profile`, {
    headers: authHeaders()
  });
  return parseJson<CandidateProfile>(res);
}

export async function startAnalysis(
  candidateId: string,
  targetRole: string,
  seniorityLevel: string,
  stackEmphasis: string[]
): Promise<AnalyzeJobAccepted> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      candidate_id: candidateId,
      target_role: targetRole,
      seniority_level: seniorityLevel,
      stack_emphasis: stackEmphasis
    })
  });
  return parseJson<AnalyzeJobAccepted>(res);
}

export async function getJobStatus(jobId: string): Promise<AnalysisJobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { headers: authHeaders() });
  return parseJson<AnalysisJobStatus>(res);
}

export async function waitForAnalysisJob(
  jobId: string,
  onProgress?: (job: AnalysisJobStatus) => void,
  timeoutMs = 180000
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
  throw new ApiError(
    humanizeError("Timed out waiting for analysis job"),
    408
  );
}

export async function analyzeCandidate(
  candidateId: string,
  targetRole: string,
  seniorityLevel: string,
  stackEmphasis: string[],
  onProgress?: (job: AnalysisJobStatus) => void
): Promise<CareerReadinessReport> {
  const accepted = await startAnalysis(candidateId, targetRole, seniorityLevel, stackEmphasis);
  return finishAnalysisJob(accepted.job_id, onProgress);
}

export async function finishAnalysisJob(
  jobId: string,
  onProgress?: (job: AnalysisJobStatus) => void
): Promise<CareerReadinessReport> {
  const job = await waitForAnalysisJob(jobId, onProgress);
  if (job.status === "failed") {
    throw new ApiError(humanizeError(job.error || "Analysis pipeline failed"), 500);
  }
  if (!job.report_id) {
    throw new ApiError("Job completed without report_id", 500);
  }
  return getReport(job.report_id);
}

export async function listReports(candidateId: string): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/candidates/${candidateId}/reports`, {
    headers: authHeaders()
  });
  return parseJson<ReportSummary[]>(res);
}

export async function getReport(reportId: string): Promise<CareerReadinessReport> {
  const res = await fetch(`${API_BASE}/reports/${reportId}`, { headers: authHeaders() });
  return parseJson<CareerReadinessReport>(res);
}

export async function exportReportPdf(reportId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/export.pdf`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new ApiError(humanizeError(`Export failed (${res.status})`), res.status);
  }
  return res.blob();
}

export async function chatWithMentor(
  candidateId: string,
  message: string,
  history: MentorChatMessage[],
  reportId?: string | null
): Promise<MentorChatResponse> {
  const res = await fetch(`${API_BASE}/mentor/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      candidate_id: candidateId,
      message,
      report_id: reportId || undefined,
      history
    })
  });
  return parseJson<MentorChatResponse>(res);
}

export async function getCandidateAnalytics(candidateId: string): Promise<CareerAnalytics> {
  const res = await fetch(`${API_BASE}/candidates/${candidateId}/analytics`, {
    headers: authHeaders()
  });
  return parseJson<CareerAnalytics>(res);
}

export async function getWorkspaceInsights(): Promise<WorkspaceInsights> {
  const res = await fetch(`${API_BASE}/workspace/insights`, { headers: authHeaders() });
  return parseJson<WorkspaceInsights>(res);
}

export function getAgent(report: CareerReadinessReport | null, name: string) {
  return report?.agent_outputs?.find((agent) => agent.name === name) ?? null;
}

export function estimateReadiness(report: CareerReadinessReport | null): number {
  if (!report) return 0;
  if (typeof report.readiness_score === "number") {
    return Math.max(0, Math.min(100, report.readiness_score));
  }
  const skills = report.profile?.skills?.length || 0;
  const gaps = getAgent(report, "SkillGapAgent")?.gaps?.length || 0;
  const base = Math.min(92, 48 + skills * 8);
  return Math.max(28, base - gaps * 8);
}
