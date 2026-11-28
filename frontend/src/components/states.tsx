/** Loading skeleton, empty state, error state and the fixture banner. */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./ui";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[10px] bg-track", className)} />;
}

export function AgreementListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading lay-bys" className="grid gap-3">
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} className="flex items-center gap-4">
          <Skeleton className="size-[60px] shrink-0" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <Card className="grid justify-items-center gap-2 py-10 text-center">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary" aria-hidden>
        <path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8" />
      </svg>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-md text-muted">{body}</p>
      {action}
    </Card>
  );
}

export function ErrorState({ title = "Something went wrong", body, action }: { title?: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="grid justify-items-start gap-2 rounded-card border border-danger-bg bg-danger-soft p-[21px] text-danger">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 8v5M12 16.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
        </svg>
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="text-[14px]">{body}</div>
      {action}
    </div>
  );
}

/** Must appear on every page that renders src/lib/fixtures data. */
export function FixtureBanner() {
  return (
    <div
      role="note"
      className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-dashed border-warning bg-warning-bg px-4 py-3 text-[13px] text-warning"
    >
      <strong className="shrink-0 rounded-[6px] bg-warning px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-white">Sample data</strong>
      <span>
        These lay-bys are design fixtures, not read from the blockchain. Buttons preview each step without sending a transaction.
        Live contract data arrives in Phase 2.
      </span>
    </div>
  );
}
