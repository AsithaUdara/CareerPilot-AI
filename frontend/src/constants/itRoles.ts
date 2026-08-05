export const IT_TARGET_ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "DevOps / Platform Engineer",
  "Data Engineer",
  "Cloud Engineer",
  "QA / Test Automation Engineer",
  "Mobile Developer"
] as const;

export const SENIORITY_LEVELS = ["Intern", "Junior", "Mid"] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];
export type ItTargetRole = (typeof IT_TARGET_ROLES)[number];

export const INTERVIEW_TAG_LABELS: Record<string, string> = {
  coding: "Technical / Coding",
  system_design: "System Design",
  behavioral: "Behavioral (STAR)",
  take_home: "Take-home Project"
};
