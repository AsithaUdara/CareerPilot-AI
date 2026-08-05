export type PageId =
  | "landing"
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
  interview_tags?: Record<string, string[]>;
};

export type CandidateProfile = {
  candidate_id: string;
  summary: string;
  skills: string[];
  education: string[];
  projects: string[];
  experience: string[];
  github_url?: string;
  linkedin_url?: string;
};

export type MatchedJob = {
  id: string;
  label: string;
  company: string;
  url: string;
  required_skills: string[];
  description_snippet: string;
  match_score?: number | null;
  source: string;
};

export type CareerReadinessReport = {
  report_id?: string | null;
  candidate_id: string;
  target_role: string;
  seniority_level?: string;
  stack_emphasis?: string[];
  profile: CandidateProfile;
  agent_outputs: AgentOutput[];
  seven_day_plan: string[];
  explainability: Record<string, string>;
  matched_jobs?: MatchedJob[];
  readiness_score?: number | null;
  job_source?: string;
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
  profile?: CandidateProfile | null;
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
  seniority_level?: string;
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
