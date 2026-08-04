import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { CareerReadinessReport, PageId, ReportSummary } from "@/types";

type AppState = {
  page: PageId;
  setPage: (page: PageId) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  candidateId: string;
  setCandidateId: (id: string) => void;
  targetRole: string;
  setTargetRole: (role: string) => void;
  report: CareerReadinessReport | null;
  setReport: (report: CareerReadinessReport | null) => void;
  reports: ReportSummary[];
  setReports: (reports: ReportSummary[]) => void;
  status: string;
  setStatus: (status: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [file, setFile] = useState<File | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [targetRole, setTargetRole] = useState("Backend Developer");
  const [report, setReport] = useState<CareerReadinessReport | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("Ready to start");
  const [busy, setBusy] = useState(false);

  const value = useMemo(
    () => ({
      page,
      setPage,
      file,
      setFile,
      candidateId,
      setCandidateId,
      targetRole,
      setTargetRole,
      report,
      setReport,
      reports,
      setReports,
      status,
      setStatus,
      busy,
      setBusy
    }),
    [page, file, candidateId, targetRole, report, reports, status, busy]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
