import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { getProfile, getReport, listReports } from "@/api/client";
import { loadSession, saveSession } from "@/lib/session";
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
  seniorityLevel: string;
  setSeniorityLevel: (level: string) => void;
  stackEmphasis: string[];
  setStackEmphasis: (items: string[]) => void;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (url: string) => void;
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
  sessionReady: boolean;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [page, setPage] = useState<PageId>("landing");
  const [file, setFile] = useState<File | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [targetRole, setTargetRole] = useState("Backend Developer");
  const [seniorityLevel, setSeniorityLevel] = useState("Junior");
  const [stackEmphasis, setStackEmphasis] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [report, setReport] = useState<CareerReadinessReport | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("Ready to start");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const session = loadSession();
    if (!session?.candidateId) {
      setSessionReady(true);
      return;
    }

    setCandidateId(session.candidateId);
    setTargetRole(session.targetRole || "Backend Developer");
    setSeniorityLevel(session.seniorityLevel || "Junior");
    setStackEmphasis(session.stackEmphasis || []);
    setGithubUrl(session.githubUrl || "");
    setLinkedinUrl(session.linkedinUrl || "");
    if (session.page && session.page !== "landing") {
      setPage(session.page);
    }

    void (async () => {
      try {
        const loadedProfile = await getProfile(session.candidateId);
        setProfile(loadedProfile);
        if (loadedProfile.github_url) setGithubUrl(loadedProfile.github_url);
        if (loadedProfile.linkedin_url) setLinkedinUrl(loadedProfile.linkedin_url);
      } catch {
        /* profile may have been cleared */
      }

      try {
        const savedReports = await listReports(session.candidateId);
        setReports(savedReports);
      } catch {
        /* ignore */
      }

      if (session.reportId) {
        try {
          const loadedReport = await getReport(session.reportId);
          setReport(loadedReport);
          setStatus("Session restored — continue from your last analysis.");
        } catch {
          /* report missing */
        }
      } else {
        setStatus("Session restored — upload or run a new analysis.");
      }

      setSessionReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (!candidateId && !report?.report_id) return;

    saveSession({
      candidateId,
      targetRole,
      seniorityLevel,
      stackEmphasis,
      githubUrl,
      linkedinUrl,
      reportId: report?.report_id ?? null,
      page
    });
  }, [
    sessionReady,
    candidateId,
    targetRole,
    seniorityLevel,
    stackEmphasis,
    githubUrl,
    linkedinUrl,
    report?.report_id,
    page
  ]);

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
      seniorityLevel,
      setSeniorityLevel,
      stackEmphasis,
      setStackEmphasis,
      githubUrl,
      setGithubUrl,
      linkedinUrl,
      setLinkedinUrl,
      profile,
      setProfile,
      report,
      setReport,
      reports,
      setReports,
      status,
      setStatus,
      busy,
      setBusy,
      sessionReady
    }),
    [
      page,
      file,
      candidateId,
      targetRole,
      seniorityLevel,
      stackEmphasis,
      githubUrl,
      linkedinUrl,
      profile,
      report,
      reports,
      status,
      busy,
      sessionReady
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
