"use client";

import { useState } from "react";
import type { LayBy, Viewer } from "@/lib/contract/types";
import { STATUS_FILTERS, statusLabel, statusName, type StatusFilter } from "@/lib/contract/status";
import { formatAvax, remainingBalance } from "@/lib/money";
import { shortAddress } from "@/lib/format";
import { LayByStatus } from "@/lib/contract/types";
import { cn } from "@/lib/cn";
import { ProductCard } from "./product-card";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";
import { ButtonLink, Card, buttonClass } from "./ui";
import { EmptyState } from "./states";

export interface AgreementTableProps {
  layBys: LayBy[];
  viewer: Viewer;
  nowSeconds: bigint;
  graceSeconds: bigint;
  /** Human labels for shop wallets, if known. Never a "verified" claim. Plain data so it can cross the server/client boundary. */
  shopNames?: Partial<Record<string, string>>;
}

/** Filterable list of agreements: one row per lay-by, collapsing to cards on mobile. */
export function AgreementTable({ layBys, viewer, nowSeconds, graceSeconds, shopNames }: AgreementTableProps) {
  const [filter, setFilter] = useState<StatusFilter>("All");
  const shown = layBys.filter((l) => filter === "All" || statusName(l.status) === filter);
  const base = viewer === "customer" ? "/customer/laybys/" : "/shop/laybys/";

  return (
    <section aria-labelledby="agreements-heading">
      <h2 id="agreements-heading" className="text-[22px] font-bold tracking-[-0.6px]">
        Agreements
      </h2>
      <div role="group" aria-label="Filter by status" className="my-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={buttonClass(filter === f ? "primary" : "secondary", "!px-3 !py-[7px] text-[13px]")}
          >
            {f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title={layBys.length === 0 ? "No lay-bys yet" : `No ${filter.toLowerCase()} lay-bys`}
          body={
            layBys.length === 0
              ? viewer === "shop"
                ? "Create the first agreement for a customer wallet."
                : "When a shop creates a lay-by for your wallet, it appears here."
              : "Try another filter."
          }
          action={layBys.length === 0 && viewer === "shop" ? <ButtonLink href="/shop/create">Create lay-by</ButtonLink> : undefined}
        />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {shown.map((l) => {
            const label = statusLabel(l, nowSeconds, graceSeconds);
            const counterparty =
              viewer === "customer"
                ? (shopNames?.[l.shop] ?? `Shop ${shortAddress(l.shop)}`)
                : `Customer ${shortAddress(l.customer)}`;
            const canPay = viewer === "customer" && l.status === LayByStatus.Active && label !== "Overdue";
            return (
              <li key={l.id.toString()}>
                <Card className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:gap-[18px]">
                  <ProductCard item={l.item} subtitle={`${counterparty} · #${l.id}`} badge={<StatusBadge label={label} />} />
                  <div className={cn("min-w-0")}>
                    <div className="text-[13px] tabular-nums">
                      <strong>{formatAvax(l.paid)}</strong> / {formatAvax(l.price)}
                    </div>
                    <ProgressBar layBy={l} />
                    <div className="text-[13px] text-subtle">{formatAvax(remainingBalance(l))} remaining</div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <ButtonLink href={`${base}${l.id}`} variant="secondary" aria-label={`View details for ${l.item}, lay-by #${l.id}`}>
                      View details
                    </ButtonLink>
                    {canPay && (
                      <ButtonLink href={`${base}${l.id}?action=pay`} aria-label={`Pay lay-by #${l.id}`}>
                        Pay
                      </ButtonLink>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
