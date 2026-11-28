import { STATUS_TONE, type StatusLabel, type StatusTone } from "@/lib/contract/status";
import { cn } from "@/lib/cn";

const TONE: Record<StatusTone, string> = {
  brand: "bg-primary-soft text-primary-text",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-neutral-bg text-neutral",
  danger: "bg-danger-bg text-danger",
};

/** Shapes differ per tone so status never relies on colour alone. */
const ICON: Record<StatusTone, string> = {
  brand: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  success: "M5 12.5l4.5 4.5L19 7.5",
  warning: "M12 8v5M12 16.5h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  neutral: "M6 12h12",
  danger: "M6 6l12 12M18 6 6 18",
};

export function StatusBadge({ label, className }: { label: StatusLabel; className?: string }) {
  const tone = STATUS_TONE[label];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[20px] px-2.5 py-[5px] text-xs font-semibold", TONE[tone], className)}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={ICON[tone]} />
      </svg>
      {label}
    </span>
  );
}
