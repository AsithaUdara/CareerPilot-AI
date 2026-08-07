import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import {
  finishAnalysisJob,
  getJobStatus,
  getProfile,
  getReport,
  listMyCandidates,
  listReports,
  startAnalysis
} from "@/api/client";
import { clearAuth, loadAuth, saveAuth } from "@/lib/authStorage";
import { humanizeError } from "@/lib/errors";
import { navigateToPage, pageFromLocation } from "@/lib/routes";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type {
  AnalysisJobStatus,
  AuthUser,
  CandidateProfile,
  CandidateSummary,
  CareerReadinessReport,
  PageId,
  ReportSummary,
  UploadStep
} from "@/types";

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued on Celery",
  resume_analysis: "Resume Analysis Agent (Gemini)",
  job_matching: "Job Matching — Adzuna + curated RAG",
  skill_gaps: "Skill Gap Agent",
  learning_roadmap: "Learning Planner Agent",
  resume_optimization: "Resume Optimization Agent",
  interview_coach: "Interview Coach Agent",
  report_composition: "Report Composition",
  completed: "Completed",
  failed: "Failed"
};

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
  uploadStep: UploadStep;
  setUploadStep: (step: UploadStep) => void;
  analysisJob: AnalysisJobStatus | null;
  setAnalysisJob: (job: AnalysisJobStatus | null) => void;
  analysisError: string | null;
  setAnalysisError: (error: string | null) => void;
  authUser: AuthUser | null;
  authToken: string | null;
  myCandidates: CandidateSummary[];
  refreshMyCandidates: () => Promise<void>;
  selectCandidate: (id: string) => Promise<void>;
  completeSignIn: (token: string, user: AuthUser) => void;
  logout: () => void;
  clearWorkspace: () => void;
  runAnalysis: () => Promise<void>;
  resumeJobPoll: (jobId: string) => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [page, setPageState] = useState<PageId>(() => pageFromLocation() ?? "landing");
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
  const [uploadStep, setUploadStep] = useState<UploadStep>("intake");
  const [analysisJob, setAnalysisJob] = useState<AnalysisJobStatus | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [myCandidates, setMyCandidates] = useState<CandidateSummary[]>([]);
  const hydrated = useRef(false);
  const pollingRef = useRef(false);

  const setPage = useCallback((next: PageId, replace = false) => {
    setPageState(next);
    navigateToPage(next, replace);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = pageFromLocation();
      if (fromUrl) setPageState(fromUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const refreshMyCandidates = useCallback(async () => {
    if (!loadAuth()?.token) {
      setMyCandidates([]);
      return;
    }
    try {
      const rows = await listMyCandidates();
      setMyCandidates(rows);
    } catch {
      setMyCandidates([]);
    }
  }, []);

  const completeSignIn = useCallback(
    (token: string, user: AuthUser) => {
      saveAuth({ token, user });
      setAuthToken(token);
      setAuthUser(user);
      setStatus("Welcome back — upload a resume or open a saved CV.");
      void refreshMyCandidates();
    },
    [refreshMyCandidates]
  );

  const clearWorkspace = useCallback(() => {
    clearSession();
    setFile(null);
    setCandidateId("");
    setProfile(null);
    setReport(null);
    setReports([]);
    setAnalysisJob(null);
    setAnalysisError(null);
    setUploadStep("intake");
    setBusy(false);
    setStatus("Workspace cleared — upload a resume to start.");
    setPage("upload");
  }, [setPage]);

  const logout = useCallback(() => {
    clearAuth();
    setAuthToken(null);
    setAuthUser(null);
    setMyCandidates([]);
    clearWorkspace();
    setPage("landing");
    setStatus("Signed out.");
  }, [clearWorkspace, setPage]);

  const selectCandidate = useCallback(
    async (id: string) => {
      if (busy) return;
      try {
        setBusy(true);
        setAnalysisError(null);
        setAnalysisJob(null);
        const loadedProfile = await getProfile(id);
        setCandidateId(id);
        setProfile(loadedProfile);
        if (loadedProfile.github_url) setGithubUrl(loadedProfile.github_url);
        if (loadedProfile.linkedin_url) setLinkedinUrl(loadedProfile.linkedin_url);
        setFile(null);

        let saved: ReportSummary[] = [];
        try {
          saved = await listReports(id);
        } catch {
          /* no reports yet */
        }
        saved.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setReports(saved);

        if (saved[0]?.report_id) {
          const loadedReport = await getReport(saved[0].report_id);
          setReport(loadedReport);
          setUploadStep("done");
          setStatus("Loaded latest report for this CV.");
          setPage("dashboard");
        } else {
          setReport(null);
          setUploadStep("review");
          setStatus("CV loaded — verify, then run analysis.");
          setPage("upload");
        }
      } catch (error) {
        const message = humanizeError(error);
        setAnalysisError(message);
        setStatus(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, setPage]
  );

  const finishJobSuccess = useCallback(
    async (data: CareerReadinessReport, activeCandidateId: string) => {
      setReport(data);
      setProfile(data.profile);
      try {
        const saved = await listReports(activeCandidateId);
        setReports(saved);
      } catch {
        /* ignore */
      }
      setUploadStep("done");
      setBusy(false);
      setAnalysisError(null);
      setStatus(
        data.job_source === "live" || data.job_source === "live+curated"
          ? `Analysis complete using ${data.job_source} job source.`
          : "Analysis complete using curated real job descriptions."
      );
      void refreshMyCandidates();
    },
    [refreshMyCandidates]
  );

  const resumeJobPoll = useCallback(
    async (jobId: string) => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      setBusy(true);
      setUploadStep("running");
      setAnalysisError(null);
      try {
        const data = await finishAnalysisJob(jobId, (progressJob) => {
          setAnalysisJob(progressJob);
          setStatus(
            `${STAGE_LABELS[progressJob.stage] || progressJob.stage} (${progressJob.progress}%)`
          );
        });
        await finishJobSuccess(data, data.candidate_id || candidateId);
      } catch (error) {
        const message = humanizeError(error);
        setAnalysisError(message);
        setStatus(message);
        setUploadStep("review");
        setBusy(false);
      } finally {
        pollingRef.current = false;
      }
    },
    [candidateId, finishJobSuccess]
  );

  const runAnalysis = useCallback(async () => {
    if (!candidateId || busy || pollingRef.current) return;
    pollingRef.current = true;
    setBusy(true);
    setUploadStep("running");
    setAnalysisError(null);
    setAnalysisJob(null);
    setStatus("Dispatching multi-agent analysis job...");
    try {
      const accepted = await startAnalysis(candidateId, targetRole, seniorityLevel, stackEmphasis);
      setAnalysisJob({
        job_id: accepted.job_id,
        candidate_id: candidateId,
        target_role: targetRole,
        seniority_level: seniorityLevel,
        status: "queued",
        stage: "queued",
        progress: 0,
        message: accepted.message
      });
      const data = await finishAnalysisJob(accepted.job_id, (progressJob) => {
        setAnalysisJob(progressJob);
        setStatus(
          `${STAGE_LABELS[progressJob.stage] || progressJob.stage} (${progressJob.progress}%)`
        );
      });
      await finishJobSuccess(data, candidateId);
    } catch (error) {
      const message = humanizeError(error);
      setAnalysisError(message);
      setStatus(message);
      setUploadStep("review");
      setBusy(false);
    } finally {
      pollingRef.current = false;
    }
  }, [busy, candidateId, finishJobSuccess, seniorityLevel, stackEmphasis, targetRole]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const auth = loadAuth();
    if (auth?.token && auth.user) {
      setAuthToken(auth.token);
      setAuthUser(auth.user);
    }

    const session = loadSession();
    if (!session?.candidateId && !auth?.token) {
      // Unknown deep link → land on home URL
      if (!pageFromLocation()) {
        setPage("landing", true);
      }
      setSessionReady(true);
      return;
    }

    if (session?.candidateId) {
      setCandidateId(session.candidateId);
      setTargetRole(session.targetRole || "Backend Developer");
      setSeniorityLevel(session.seniorityLevel || "Junior");
      setStackEmphasis(session.stackEmphasis || []);
      setGithubUrl(session.githubUrl || "");
      setLinkedinUrl(session.linkedinUrl || "");
      if (session.uploadStep) setUploadStep(session.uploadStep);
      // Prefer the URL the user opened; only restore session page on `/`
      const urlPage = pageFromLocation();
      if ((!urlPage || urlPage === "landing") && session.page && session.page !== "landing") {
        setPage(session.page, true);
      } else if (urlPage) {
        setPageState(urlPage);
      }
    } else if (!pageFromLocation()) {
      setPage("landing", true);
    }

    void (async () => {
      if (auth?.token) {
        try {
          const rows = await listMyCandidates();
          setMyCandidates(rows);
        } catch {
          /* token may be stale */
        }
      }

      if (!session?.candidateId) {
        setSessionReady(true);
        return;
      }

      try {
        const loadedProfile = await getProfile(session.candidateId);
        setProfile(loadedProfile);
        if (loadedProfile.github_url) setGithubUrl(loadedProfile.github_url);
        if (loadedProfile.linkedin_url) setLinkedinUrl(loadedProfile.linkedin_url);
        if (!session.uploadStep || session.uploadStep === "intake") {
          setUploadStep("review");
        }
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
          if (session.uploadStep !== "running") {
            setUploadStep(session.uploadStep === "done" ? "done" : "review");
          }
        } catch {
          /* report missing */
        }
      } else {
        setStatus("Session restored — verify your profile, then run analysis.");
      }

      if (session.jobId) {
        try {
          const job = await getJobStatus(session.jobId);
          setAnalysisJob(job);
          if (job.status === "queued" || job.status === "running") {
            setUploadStep("running");
            setPage("upload");
            setSessionReady(true);
            void resumeJobPoll(session.jobId);
            return;
          }
          if (job.status === "completed" && job.report_id) {
            const loaded = await getReport(job.report_id);
            await finishJobSuccess(loaded, session.candidateId);
          } else if (job.status === "failed") {
            setAnalysisError(humanizeError(job.error || "Analysis failed"));
            setUploadStep("review");
          }
        } catch {
          /* job gone */
        }
      }

      setSessionReady(true);
    })();
  }, [finishJobSuccess, resumeJobPoll]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!candidateId && !report?.report_id) return;

    const running =
      analysisJob &&
      (analysisJob.status === "queued" || analysisJob.status === "running");

    saveSession({
      candidateId,
      targetRole,
      seniorityLevel,
      stackEmphasis,
      githubUrl,
      linkedinUrl,
      reportId: report?.report_id ?? null,
      page,
      uploadStep,
      jobId: running ? analysisJob.job_id : null
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
    page,
    uploadStep,
    analysisJob
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
      sessionReady,
      uploadStep,
      setUploadStep,
      analysisJob,
      setAnalysisJob,
      analysisError,
      setAnalysisError,
      authUser,
      authToken,
      myCandidates,
      refreshMyCandidates,
      selectCandidate,
      completeSignIn,
      logout,
      clearWorkspace,
      runAnalysis,
      resumeJobPoll
    }),
    [
      page,
      setPage,
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
      sessionReady,
      uploadStep,
      analysisJob,
      analysisError,
      authUser,
      authToken,
      myCandidates,
      refreshMyCandidates,
      selectCandidate,
      completeSignIn,
      logout,
      clearWorkspace,
      runAnalysis,
      resumeJobPoll
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
