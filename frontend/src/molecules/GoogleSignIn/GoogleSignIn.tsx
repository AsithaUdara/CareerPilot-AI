import { useEffect, useRef } from "react";
import { signInWithGoogle } from "@/api/client";
import { humanizeError } from "@/lib/errors";
import { useAppState } from "@/state/AppState";
import styles from "./GoogleSignIn.module.scss";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
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

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

type GoogleSignInProps = {
  compact?: boolean;
};

export function GoogleSignIn({ compact = false }: GoogleSignInProps) {
  const { completeSignIn, authUser, logout, setStatus } = useAppState();
  const buttonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authUser || !CLIENT_ID || !buttonRef.current) return;

    let cancelled = false;

    const mount = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            setStatus("Signing in with Google...");
            const data = await signInWithGoogle(response.credential);
            completeSignIn(data.access_token, data.user);
          } catch (error) {
            setStatus(humanizeError(error));
          }
        }
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: compact ? "medium" : "large",
        text: "signin_with",
        shape: "pill",
        width: compact ? 180 : 240
      });
    };

    if (window.google?.accounts?.id) {
      mount();
      return () => {
        cancelled = true;
      };
    }

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
  }, [authUser, compact, completeSignIn, setStatus]);

  if (authUser) {
    return (
      <div className={styles.signedIn}>
        {authUser.picture_url ? (
          <img className={styles.avatar} src={authUser.picture_url} alt="" />
        ) : (
          <span className={styles.avatarFallback}>
            {(authUser.name || authUser.email || "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        {!compact && (
          <div className={styles.meta}>
            <p className={styles.name}>{authUser.name || "Signed in"}</p>
            <p className={styles.email}>{authUser.email}</p>
          </div>
        )}
        <button type="button" className={styles.logout} onClick={logout}>
          Sign out
        </button>
      </div>
    );
  }

  if (!CLIENT_ID) {
    return (
      <p className={styles.hint} title="Set VITE_GOOGLE_CLIENT_ID in frontend/.env">
        Google Sign-In not configured
      </p>
    );
  }

  return <div ref={buttonRef} className={styles.buttonHost} />;
}
