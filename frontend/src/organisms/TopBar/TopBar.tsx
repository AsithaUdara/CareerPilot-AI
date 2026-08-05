import { GoogleSignIn } from "@/molecules/GoogleSignIn";
import { StatusPill } from "@/molecules/StatusPill";
import type { PageId } from "@/types";
import { useAppState } from "@/state/AppState";
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
    subtitle: "Verify your profile, then run the multi-agent pipeline."
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
};

export function TopBar({ page, status }: TopBarProps) {
  const { clearWorkspace, busy, authUser, candidateId } = useAppState();
  const meta = TITLES[page];
  return (
    <header className={styles.topbar}>
      <div>
        <h1>{meta.title}</h1>
        <p className={styles.subtitle}>{meta.subtitle}</p>
      </div>
      <div className={styles.right}>
        <StatusPill label={status} />
        {busy && <span className={styles.busyTag}>Agents running</span>}
        <GoogleSignIn compact />
        {!authUser && (
          <span className={styles.guest}>
            {candidateId ? `ID ${candidateId.slice(0, 8)}` : "Guest"}
          </span>
        )}
        <button
          type="button"
          className={styles.reset}
          onClick={clearWorkspace}
          title="Clear local session and start fresh"
        >
          Start fresh
        </button>
      </div>
    </header>
  );
}
