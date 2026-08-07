import { AppStateProvider, useAppState } from "@/state/AppState";
import { AppShell } from "@/templates/AppShell";
import { AnalysisGate } from "@/organisms/AnalysisGate";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { ReadinessPage } from "@/pages/ReadinessPage";
import { GapsPage } from "@/pages/GapsPage";
import { PlanPage } from "@/pages/PlanPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { MentorPage } from "@/pages/MentorPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { InsightsPage } from "@/pages/InsightsPage";

function Shell() {
  const { page } = useAppState();

  if (page === "landing") {
    return <LandingPage />;
  }

  const analysisPages: Partial<Record<typeof page, JSX.Element>> = {
    dashboard: <DashboardPage />,
    readiness: <ReadinessPage />,
    gaps: <GapsPage />,
    plan: <PlanPage />,
    reports: <ReportsPage />,
    mentor: <MentorPage />,
    analytics: <AnalyticsPage />
  };

  return (
    <AppShell>
      {page === "upload" && <UploadPage />}
      {page === "insights" && <InsightsPage />}
      {analysisPages[page] && <AnalysisGate>{analysisPages[page]}</AnalysisGate>}
    </AppShell>
  );
}

export function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
