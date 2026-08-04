export type PageId =
  | "dashboard"
  | "upload"
  | "readiness"
  | "gaps"
  | "plan"
  | "reports";

export type AgentOutput = {
  name: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  evidence: string[];
};

export type CandidateProfile = {
  candidate_id: string;
  summary: string;
  skills: string[];
  education: string[];
  projects: string[];
  experience: string[];
};

export type CareerReadinessReport = {
  report_id?: string | null;
  candidate_id: string;
  target_role: string;
  profile: CandidateProfile;
  agent_outputs: AgentOutput[];
  seven_day_plan: string[];
  explainability: Record<string, string>;
};

export type ReportSummary = {
  report_id: string;
  candidate_id: string;
  target_role: string;
  created_at?: string | null;
};

export type UploadResponse = {
  candidate_id: string;
  filename: string;
  message: string;
};

export type AnalyzeJobAccepted = {
  job_id: string;
  status: string;
  message: string;
};

export type AnalysisJobStatus = {
  job_id: string;
  candidate_id: string;
  target_role: string;
  status: string;
  stage: string;
  progress: number;
  message: string;
  report_id?: string | null;
  error?: string | null;
};

export type KpiTone = "blue" | "teal" | "amber" | "rose";

export type NavItemConfig = {
  id: PageId;
  label: string;
  icon: string;
};
