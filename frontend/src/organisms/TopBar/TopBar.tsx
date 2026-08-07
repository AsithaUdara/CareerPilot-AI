import { StatusPill } from "@/molecules/StatusPill";
import { UserAuthChip } from "@/molecules/GoogleSignIn/GoogleSignIn";
import type { PageId } from "@/types";
import { useAppState } from "@/state/AppState";
import styles from "./TopBar.module.scss";

const TITLES: Record<PageId, { title: string; subtitle: string }> = {
  landing: {
    title: "CareerPilot AI",
    subtitle: "Multi-agent career readiness operating system."
  },
  dashboard: {
    title: "Analysis Overview",
    subtitle: "Your score, matched jobs, and prioritized next steps."
  },
  upload: {
    title: "Upload & Analyse",
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
  const { busy, authUser, uploadStep } = useAppState();
  const meta = TITLES[page];
  const pillLabel = busy
    ? page === "upload" && uploadStep === "intake"
      ? "Extracting profile…"
      : "Agents running…"
    : status;

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <h1>{meta.title}</h1>
        <p className={styles.subtitle}>{meta.subtitle}</p>
      </div>
      <div className={styles.right}>
        {(busy ||
          (status &&
            !status.startsWith("Signed in") &&
            !status.startsWith("Welcome back") &&
            !status.startsWith("Session restored") &&
            !status.startsWith("Choose a resume") &&
            status !== "Ready to start")) && <StatusPill label={pillLabel} />}
        {authUser ? <UserAuthChip compact /> : null}
      </div>
    </header>
  );
}
