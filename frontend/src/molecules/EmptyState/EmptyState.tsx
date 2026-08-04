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
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps): ReactNode {
  return (
    <Panel className={styles.empty}>
      <h2>{title}</h2>
      <Text muted>{description}</Text>
      <Button variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    </Panel>
  );
}
