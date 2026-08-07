import { useEffect, useId, useRef, useState } from "react";
import { useAppState } from "@/state/AppState";
import styles from "./GoogleSignIn.module.scss";

type UserAuthChipProps = {
  compact?: boolean;
  onSignInClick?: () => void;
};

/** Account menu when signed in; optional Sign in button when not. */
export function UserAuthChip({ compact = false, onSignInClick }: UserAuthChipProps) {
  const { authUser, logout, clearWorkspace } = useAppState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!authUser) {
    if (!onSignInClick) return null;
    return (
      <button type="button" className={styles.signInBtn} onClick={onSignInClick}>
        Sign in
      </button>
    );
  }

  const initial = (authUser.name || authUser.email || "U").slice(0, 1).toUpperCase();
  const displayName = authUser.name || authUser.email.split("@")[0];

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title={displayName}
      >
        {authUser.picture_url ? (
          <img className={styles.avatar} src={authUser.picture_url} alt="" />
        ) : (
          <span className={styles.avatarFallback}>{initial}</span>
        )}
        {!compact && <span className={styles.triggerName}>{displayName}</span>}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden>
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path
              d="M2.2 4.2 6 8l3.8-3.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className={styles.menu} id={menuId} role="menu">
          <div className={styles.menuHeader}>
            <p className={styles.name}>{displayName}</p>
            <p className={styles.email}>{authUser.email}</p>
          </div>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              clearWorkspace();
            }}
          >
            Start fresh
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use UserAuthChip */
export function GoogleSignIn(props: UserAuthChipProps) {
  return <UserAuthChip {...props} />;
}
