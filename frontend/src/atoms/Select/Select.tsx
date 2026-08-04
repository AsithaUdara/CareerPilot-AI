import type { SelectHTMLAttributes } from "react";
import styles from "./Select.module.scss";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[];
};

export function Select({ label, options, id, ...rest }: SelectProps) {
  const selectId = id || "select-field";
  return (
    <label className={styles.wrap} htmlFor={selectId}>
      <span className={styles.label}>{label}</span>
      <select id={selectId} className={styles.select} {...rest}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
