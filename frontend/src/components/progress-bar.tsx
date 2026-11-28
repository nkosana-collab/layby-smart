import type { LayByRecord } from "@/lib/contract/types";
import { formatAvax, percentPaid } from "@/lib/money";

export function ProgressBar({ layBy, label = "Payment progress" }: { layBy: Pick<LayByRecord, "price" | "paid">; label?: string }) {
  const pct = percentPaid(layBy);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${formatAvax(layBy.paid)} of ${formatAvax(layBy.price)} paid (${pct}%)`}
      className="my-3 h-[9px] overflow-hidden rounded-[20px] bg-track"
    >
      <div className="h-full rounded-[20px] bg-success-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
