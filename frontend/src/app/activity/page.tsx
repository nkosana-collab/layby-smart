import type { Metadata } from "next";
import Link from "next/link";
import { describeEvent } from "@/components/timeline";
import { EmptyState, FixtureBanner } from "@/components/states";
import { Card, PageTitle } from "@/components/ui";
import { FIXTURE_EVENTS, FIXTURE_LAYBYS } from "@/lib/fixtures";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  // Newest first. Phase 2 reads these from the contract's events (history API).
  const events = [...FIXTURE_EVENTS].sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)));
  const item = (id: bigint) => FIXTURE_LAYBYS.find((l) => l.id === id)?.item ?? "Lay-by";

  return (
    <>
      <FixtureBanner />
      <PageTitle title="Activity" lede="Every recorded event for your wallet's lay-bys, newest first." />
      {events.length === 0 ? (
        <EmptyState title="No activity yet" body="Payments, collections and cancellations will appear here." />
      ) : (
        <Card>
          <ul className="m-0 list-none p-0">
            {events.map((e, i) => {
              const d = describeEvent(e);
              return (
                <li key={i} className="flex items-center justify-between gap-4 border-b border-divider py-3 last:border-0">
                  <div className="min-w-0">
                    <strong>
                      {d.title} · {item(e.id)}
                    </strong>
                    <div className="text-[13px] text-subtle">{d.detail}</div>
                    {e.timestamp !== undefined && <div className="text-xs text-subtle">{formatDateTime(e.timestamp)}</div>}
                  </div>
                  <Link href={`/customer/laybys/${e.id}`} className="shrink-0 font-semibold text-primary hover:underline">
                    #{e.id.toString()} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
