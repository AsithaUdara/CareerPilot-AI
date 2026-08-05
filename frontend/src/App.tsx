import { AppStateProvider, useAppState } from "@/state/AppState";
import { AppShell } from "@/templates/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { ReadinessPage } from "@/pages/ReadinessPage";
import { GapsPage } from "@/pages/GapsPage";
import { PlanPage } from "@/pages/PlanPage";
import { ReportsPage } from "@/pages/ReportsPage";

function Shell() {
  const { page } = useAppState();

  if (page === "landing") {
    return <LandingPage />;
  }

  return (
    <AppShell>
      {page === "dashboard" && <DashboardPage />}
      {page === "upload" && <UploadPage />}
      {page === "readiness" && <ReadinessPage />}
      {page === "gaps" && <GapsPage />}
      {page === "plan" && <PlanPage />}
      {page === "reports" && <ReportsPage />}
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
