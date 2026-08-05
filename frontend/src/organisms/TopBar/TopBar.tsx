import { StatusPill } from "@/molecules/StatusPill";
import { ProfileChip } from "@/molecules/ProfileChip";
import type { PageId } from "@/types";
import styles from "./TopBar.module.scss";

const TITLES: Record<PageId, { title: string; subtitle: string }> = {
  landing: {
    title: "CareerPilot AI",
    subtitle: "Multi-agent career readiness operating system."
  },
  dashboard: {
    title: "Readiness Dashboard",
    subtitle: "Explainable career insights and prioritized next steps."
  },
  upload: {
    title: "Upload & Analyze",
    subtitle: "Parse your resume and generate a multi-agent readiness report."
  },
  readiness: {
    title: "Career Readiness",
    subtitle: "Strengths, role fit, and evidence-backed recommendations."
  },
  gaps: {
    title: "Skill Gaps & Roadmap",
    subtitle: "Close the highest-impact gaps for your target role."
  },
  plan: {
    title: "Interview Prep & Hiring Sprint",
    subtitle: "7-day IT hiring sprint with categorized interview drills."
  },
  reports: {
    title: "Saved Reports",
    subtitle: "Revisit previous analyses stored in your workspace."
  },
  mentor: {
    title: "AI Career Mentor",
    subtitle: "Conversational coaching grounded in your readiness report."
  },
  analytics: {
    title: "Career Analytics",
    subtitle: "Track readiness, closed gaps, and progress across analyses."
  },
  insights: {
    title: "Workspace Insights",
    subtitle: "Institution-style overview of candidates, roles, and readiness."
  }
};

type TopBarProps = {
  page: PageId;
  status: string;
  candidateId: string;
};

export function TopBar({ page, status, candidateId }: TopBarProps) {
  const meta = TITLES[page];
  return (
    <header className={styles.topbar}>
      <div>
        <h1>{meta.title}</h1>
        <p className={styles.subtitle}>{meta.subtitle}</p>
      </div>
      <div className={styles.right}>
        <StatusPill label={status} />
        <ProfileChip
          name="Candidate"
          detail={candidateId ? candidateId.slice(0, 8) : "Not uploaded"}
        />
      </div>
    </header>
  );
}
