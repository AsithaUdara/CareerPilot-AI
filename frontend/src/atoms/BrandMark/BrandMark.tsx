import logo from "@/assets/careerpilot-logo-v2.png";
import styles from "./BrandMark.module.scss";

type BrandMarkProps = {
  /** When false, only the C/robot mark is shown (collapsed sidebar). */
  showWordmark?: boolean;
  className?: string;
};

export function BrandMark({ showWordmark = true, className = "" }: BrandMarkProps) {
  return (
    <div className={`${styles.wrap} ${className}`}>
      <div className={styles.iconFrame} aria-hidden={!showWordmark}>
        <img src={logo} alt="" className={styles.icon} draggable={false} />
      </div>
      {showWordmark && (
        <div className={styles.wordmark}>
          <p className={styles.name}>
            Career<span className={styles.pilot}>Pilot</span>
          </p>
          <span className={styles.aiBadge}>AI</span>
        </div>
      )}
      <span className={styles.srOnly}>CareerPilot AI</span>
    </div>
  );
}
