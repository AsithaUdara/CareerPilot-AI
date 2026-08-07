import type { ReactNode } from "react";
import { Button } from "@/atoms/Button";
import { Text } from "@/atoms/Text";
import { Panel } from "@/atoms/Panel";
import styles from "./EmptyState.module.scss";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = "◈"
}: EmptyStateProps): ReactNode {
  return (
    <Panel className={styles.empty}>
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{icon}</span>
        <span className={`${styles.ring} ${styles.ringA}`} />
        <span className={`${styles.ring} ${styles.ringB}`} />
      </div>
      <h2>{title}</h2>
      <Text muted>{description}</Text>
      <Button variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    </Panel>
  );
}
