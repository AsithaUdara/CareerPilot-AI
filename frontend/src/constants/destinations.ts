import type { PageId } from "@/types";

/** Sub-sections of the Analysis area — keeps sidebar sub-nav, gates, and shell in sync. */
export const ANALYSIS_SECTIONS: {
  id: PageId;
  label: string;
  blurb: string;
  icon: string;
}[] = [
  {
    id: "dashboard",
    label: "Overview",
    blurb: "Score overview, matched jobs, and quick next steps.",
    icon: "◫"
  },
  {
    id: "readiness",
    label: "Readiness",
    blurb: "Evidence-backed fit for your target role.",
    icon: "◎"
  },
  {
    id: "gaps",
    label: "Skill Gaps",
    blurb: "Priority gaps and what to learn first.",
    icon: "☰"
  },
  {
    id: "plan",
    label: "Hiring Sprint",
    blurb: "7-day plan and interview drills.",
    icon: "◷"
  },
  {
    id: "mentor",
    label: "AI Mentor",
    blurb: "Ask coaching questions grounded in your report.",
    icon: "✦"
  },
  {
    id: "reports",
    label: "Reports",
    blurb: "Revisit saved analyses for this workspace.",
    icon: "▤"
  },
  {
    id: "analytics",
    label: "Analytics",
    blurb: "Track readiness and gaps across analyses.",
    icon: "∿"
  }
];

export const ANALYSIS_PAGE_IDS: PageId[] = ANALYSIS_SECTIONS.map((s) => s.id);
