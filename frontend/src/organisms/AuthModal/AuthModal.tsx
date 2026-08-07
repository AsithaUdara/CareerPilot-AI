import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/api/client";
import { humanizeError } from "@/lib/errors";
import { useAppState } from "@/state/AppState";
import styles from "./AuthModal.module.scss";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

export type AuthMode = "signin" | "signup";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AuthModal({ open, mode, onModeChange, onClose, onSuccess }: AuthModalProps) {
  const { completeSignIn } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setError(null);
  }, [mode, open]);

  useEffect(() => {
    if (!open || !GOOGLE_CLIENT_ID || !googleRef.current) return;
    let cancelled = false;

    const finish = async (credential: string) => {
      try {
        setBusy(true);
        setError(null);
        const data = await signInWithGoogle(credential);
        completeSignIn(data.access_token, data.user);
        onSuccess?.();
        onClose();
      } catch (err) {
        setError(humanizeError(err));
      } finally {
        setBusy(false);
      }
    };

    const mount = () => {
      if (cancelled || !window.google || !googleRef.current) return;
      googleRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          void finish(response.credential);
        }
      });
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320
      });
    };

    if (window.google?.accounts?.id) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-gis="1"]');
      if (existing) {
        existing.addEventListener("load", mount);
        return () => {
          cancelled = true;
          existing.removeEventListener("load", mount);
        };
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleGis = "1";
      script.addEventListener("load", mount);
      document.head.appendChild(script);
      return () => {
        cancelled = true;
        script.removeEventListener("load", mount);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [open, completeSignIn, onClose, onSuccess]);

  if (!open) return null;

  const switchMode = (next: AuthMode) => {
    setError(null);
    onModeChange(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data =
        mode === "signup"
          ? await signUpWithEmail(email.trim(), password, name.trim())
          : await signInWithEmail(email.trim(), password);
      completeSignIn(data.access_token, data.user);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(humanizeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className={styles.kicker}>CareerPilot AI</p>
        <h2 id={titleId}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className={styles.sub}>
          {mode === "signup"
            ? "Sign up with any email to save CV summaries and reports."
            : "Sign in to continue to your workspace."}
        </p>

        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          {mode === "signup" && (
            <label className={styles.field}>
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className={styles.switchHint}>
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => switchMode("signup")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => switchMode("signin")}>
                Sign in
              </button>
            </>
          )}
        </p>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className={styles.divider}>
              <span>or</span>
            </div>
            <div ref={googleRef} className={styles.googleHost} />
          </>
        )}
      </div>
    </div>
  );
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}
