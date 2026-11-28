import type { LayByEvent } from "@/lib/contract/types";
import { bpsToPercent, formatAvax } from "@/lib/money";
import { explorerTx, formatDateTime, shortAddress } from "@/lib/format";

export function describeEvent(e: LayByEvent): { title: string; detail: string } {
  switch (e.kind) {
    case "Created":
      return { title: "Created", detail: `Shop ${shortAddress(e.shop)} opened the agreement · ${formatAvax(e.price)} · fee ${bpsToPercent(e.feeBps)}` };
    case "Payment":
      return { title: "Payment", detail: `${formatAvax(e.amount)} paid · ${formatAvax(e.newBalance)} remaining` };
    case "Completed":
      return { title: "Completed", detail: `Fully paid (${formatAvax(e.totalPaid)}). Ready for collection` };
    case "Collected":
      return { title: "Collected", detail: `${formatAvax(e.amountReleased)} released to the shop` };
    case "Cancelled":
      return { title: "Cancelled", detail: `${formatAvax(e.refund)} refunded · ${formatAvax(e.fee)} fee · by ${shortAddress(e.cancelledBy)}` };
    case "Expired":
      return { title: "Expired", detail: `${formatAvax(e.refund)} refunded · ${formatAvax(e.fee)} fee to the shop` };
    case "DepositMovedOut":
      return { title: "Deposit moved out", detail: `${formatAvax(e.amount)} moved to lay-by #${e.toId}` };
    case "DepositMovedIn":
      return { title: "Deposit moved in", detail: `${formatAvax(e.amount)} moved from lay-by #${e.fromId}` };
  }
}

export function Timeline({ events }: { events: LayByEvent[] }) {
  if (events.length === 0) return <p className="text-muted">No recorded activity yet.</p>;
  return (
    <ol className="m-0 list-none p-0">
      {events.map((e, i) => {
        const d = describeEvent(e);
        return (
          <li key={i} className="my-[18px] flex items-start gap-3">
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <strong>{d.title}</strong>
              <div className="text-[13px] text-subtle">{d.detail}</div>
              <div className="text-xs text-subtle">
                {e.timestamp !== undefined && formatDateTime(e.timestamp)}
                {e.txHash && (
                  <>
                    {" · "}
                    <a href={explorerTx(e.txHash)} target="_blank" rel="noreferrer" className="text-primary underline">
                      View on Snowtrace
                    </a>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
