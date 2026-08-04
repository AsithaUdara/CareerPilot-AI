import styles from "./FileDrop.module.scss";

type FileDropProps = {
  fileName?: string;
  onChange: (file: File | null) => void;
};

export function FileDrop({ fileName, onChange }: FileDropProps) {
  return (
    <div className={styles.wrap}>
      <input
        id="resume-file"
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <label htmlFor="resume-file" className={styles.label}>
        <strong>{fileName || "Drop or choose a resume file"}</strong>
        <span>Supported: TXT, PDF, DOCX</span>
      </label>
    </div>
  );
}
