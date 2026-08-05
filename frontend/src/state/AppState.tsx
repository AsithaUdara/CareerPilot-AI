import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { CandidateProfile, CareerReadinessReport, PageId, ReportSummary } from "@/types";

type AppState = {
  page: PageId;
  setPage: (page: PageId) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  candidateId: string;
  setCandidateId: (id: string) => void;
  targetRole: string;
  setTargetRole: (role: string) => void;
  profile: CandidateProfile | null;
  setProfile: (profile: CandidateProfile | null) => void;
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
  const [page, setPage] = useState<PageId>("landing");
  const [file, setFile] = useState<File | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [targetRole, setTargetRole] = useState("Backend Developer");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
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
      profile,
      setProfile,
      report,
      setReport,
      reports,
      setReports,
      status,
      setStatus,
      busy,
      setBusy
    }),
    [page, file, candidateId, targetRole, profile, report, reports, status, busy]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
