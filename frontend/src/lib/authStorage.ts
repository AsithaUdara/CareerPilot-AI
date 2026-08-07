import type { AuthUser } from "@/types";

const AUTH_KEY = "careerpilot_auth_v1";

export type PersistedAuth = {
  token: string;
  user: AuthUser;
};

export function loadAuth(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return null;
  }
}

export function saveAuth(auth: PersistedAuth): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {
    /* ignore */
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
