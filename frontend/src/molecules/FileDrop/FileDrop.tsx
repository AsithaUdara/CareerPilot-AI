import { useState, type DragEvent } from "react";
import styles from "./FileDrop.module.scss";

type FileDropProps = {
  fileName?: string;
  onChange: (file: File | null) => void;
};

export function FileDrop({ fileName, onChange }: FileDropProps) {
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  };

  return (
    <div
      className={`${styles.wrap} ${dragging ? styles.dragging : ""} ${fileName ? styles.filled : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        id="resume-file"
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <label htmlFor="resume-file" className={styles.label}>
        <span className={styles.icon}>{fileName ? "✓" : "⇪"}</span>
        <strong>{fileName || "Drop your resume here"}</strong>
        <span className={styles.sub}>
          {fileName ? "Ready to upload — click to replace" : "or click to browse · TXT, PDF, DOCX"}
        </span>
      </label>
    </div>
  );
}
