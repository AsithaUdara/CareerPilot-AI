import { useId, type SelectHTMLAttributes } from "react";
import styles from "./Select.module.scss";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[];
};

export function Select({ label, options, id, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <label className={styles.wrap} htmlFor={selectId}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        <select id={selectId} className={styles.select} {...rest}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden>
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
    </label>
  );
}
