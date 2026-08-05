import type { PageId } from "@/types";

const STORAGE_KEY = "careerpilot_session_v1";

export type PersistedSession = {
  candidateId: string;
  targetRole: string;
  seniorityLevel: string;
  stackEmphasis: string[];
  githubUrl: string;
  linkedinUrl: string;
  reportId: string | null;
  page: PageId;
};

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota errors */
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
