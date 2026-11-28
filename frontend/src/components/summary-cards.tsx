import type { LayBy } from "@/lib/contract/types";
import { LayByStatus } from "@/lib/contract/types";
import { heldInEscrow } from "@/lib/contract/status";
import { formatAvax } from "@/lib/money";
import { Card } from "./ui";

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3 md:p-[21px]">
      <div className="text-[13px] text-subtle">{label}</div>
      <div className="text-[22px] font-extrabold tracking-[-0.7px] tabular-nums md:text-[28px]">{value}</div>
      {hint && <div className="text-xs text-subtle">{hint}</div>}
    </Card>
  );
}

/** The three dashboard figures from the prototype, computed from the lay-bys shown. */
export function SummaryCards({ layBys, viewer }: { layBys: LayBy[]; viewer: "customer" | "shop" }) {
  const escrow = layBys.reduce((sum, l) => sum + heldInEscrow(l), 0n);
  const ready = layBys.filter((l) => l.status === LayByStatus.Completed).length;
  return (
    <div className="mb-[22px] grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3.5">
      <StatCard label="Total agreements" value={String(layBys.length)} />
      <StatCard label="In escrow" value={formatAvax(escrow)} hint="Held by the contract, not the shop" />
      <StatCard
        label={viewer === "customer" ? "Ready to collect" : "Awaiting collection"}
        value={String(ready)}
      />
    </div>
  );
}
