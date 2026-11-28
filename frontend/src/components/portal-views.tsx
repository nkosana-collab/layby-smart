"use client";

/** Live (contract-backed) views for the portal routes. */
import Link from "next/link";
import type { Address, LayBy, TxHash, Viewer } from "@/lib/contract/types";
import { useChainTime, useGraceSeconds, useHistory, useLayBy, useLayBysOf, useLayByWrite, useWallet } from "@/lib/contract/hooks";
import { explainError } from "@/lib/contract/errors";
import { formatDateTime, shortAddress } from "@/lib/format";
import { AgreementDetail, NotFoundAgreement, type AgreementAction } from "./agreement-detail";
import { AgreementTable } from "./agreement-table";
import { CreateLayByForm, type CreateLayByArgs } from "./create-layby-form";
import { describeEvent } from "./timeline";
import { AgreementListSkeleton, EmptyState, ErrorState } from "./states";
import { SummaryCards } from "./summary-cards";
import { Button, ButtonLink, Card, PageTitle } from "./ui";
import { WalletGate } from "./wallet";

function useClock() {
  const time = useChainTime();
  const grace = useGraceSeconds();
  return { now: time.data, grace: grace.data, error: time.error ?? grace.error };
}

function Retry({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <ErrorState
      title="Couldn't read the contract"
      body={`${explainError(error)} Check your connection; the Fuji RPC may be busy.`}
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}

/* ---------- dashboards ---------- */

export function DashboardView({ viewer }: { viewer: Viewer }) {
  return (
    <WalletGate purpose={viewer === "customer" ? "see your lay-bys" : "manage your shop's lay-bys"}>
      {(address) => <Dashboard viewer={viewer} address={address} />}
    </WalletGate>
  );
}

function Dashboard({ viewer, address }: { viewer: Viewer; address: Address }) {
  const list = useLayBysOf(viewer, address);
  const { now, grace, error } = useClock();
  if (list.error || error) return <Retry error={list.error ?? error} onRetry={() => list.refetch()} />;
  if (!list.data || now === undefined || grace === undefined) return <AgreementListSkeleton />;
  return (
    <>
      <SummaryCards layBys={list.data} viewer={viewer} />
      <AgreementTable layBys={list.data} viewer={viewer} nowSeconds={now} graceSeconds={grace} />
    </>
  );
}

/* ---------- detail ---------- */

export function DetailView({ id, viewer, initialAction }: { id: bigint | null; viewer: Viewer; initialAction?: "pay" }) {
  const wallet = useWallet();
  const q = useLayBy(id);
  const { now, grace, error } = useClock();
  const history = useHistory(q.data);
  const write = useLayByWrite();

  if (id === null) return <NotFoundAgreement viewer={viewer} />;
  if (q.error || error) return <Retry error={q.error ?? error} onRetry={() => q.refetch()} />;
  if (q.data === undefined || now === undefined || grace === undefined) return <AgreementListSkeleton rows={1} />;
  if (q.data === null) return <NotFoundAgreement viewer={viewer} />;
  const l: LayBy = q.data;

  async function onSubmit(a: AgreementAction): Promise<{ txHash: TxHash; blockNumber?: bigint }> {
    try {
      const r = await write.mutateAsync(
        a.kind === "pay"
          ? { functionName: "pay", args: [l.id], value: a.amount }
          : { functionName: a.kind === "collect" ? "confirmCollection" : a.kind, args: [l.id] },
      );
      return { txHash: r.txHash, blockNumber: r.blockNumber };
    } catch (e) {
      throw new Error(explainError(e));
    }
  }

  return (
    <AgreementDetail
      layBy={l}
      events={history.data?.events ?? []}
      historyState={history.isLoading ? "loading" : history.error ? "error" : history.data && !history.data.reconciled ? "incomplete" : "ok"}
      viewer={viewer}
      wallet={wallet.isConnected && wallet.onFuji ? wallet.address : undefined}
      nowSeconds={now}
      graceSeconds={grace}
      shopName={`Shop ${shortAddress(l.shop)}`}
      initialAction={initialAction}
      onSubmit={onSubmit}
      connectHint={!wallet.isConnected ? "connect" : !wallet.onFuji ? "switch" : undefined}
    />
  );
}

/* ---------- create ---------- */

export function CreateView() {
  const write = useLayByWrite();
  const { grace } = useClock();
  return (
    <WalletGate purpose="create a lay-by as a shop">
      {(address) => (
        <CreateLayByForm
          graceSeconds={grace ?? 120n}
          shop={address}
          onSubmit={async (a: CreateLayByArgs) => {
            try {
              const r = await write.mutateAsync({
                functionName: "createLayBy",
                args: [a.customer, a.item, a.price, a.completionDate, a.feeBps],
              });
              const created = r.events.find((e) => e.kind === "Created");
              if (!created) throw new Error("Created, but the LayByCreated event was missing from the receipt.");
              return { id: created.id, txHash: r.txHash };
            } catch (e) {
              throw new Error(explainError(e));
            }
          }}
        />
      )}
    </WalletGate>
  );
}

/* ---------- activity ---------- */

export function ActivityView() {
  return <WalletGate purpose="see your activity">{(address) => <Activity address={address} />}</WalletGate>;
}

function Activity({ address }: { address: Address }) {
  const h = useHistory(null, { all: true });
  if (h.error) return <Retry error={h.error} onRetry={() => h.refetch()} />;
  if (!h.data) return <AgreementListSkeleton rows={4} />;
  const me = address.toLowerCase();
  const created = h.data.events.filter((e) => e.kind === "Created");
  const roleOf = new Map<string, "customer" | "shop">();
  const items = new Map<string, string>();
  for (const e of created) {
    if (e.kind !== "Created") continue;
    if (e.shop.toLowerCase() === me) roleOf.set(e.id.toString(), "shop");
    else if (e.customer.toLowerCase() === me) roleOf.set(e.id.toString(), "customer");
    items.set(e.id.toString(), e.item ?? "Lay-by");
  }
  const mine = h.data.events.filter((e) => roleOf.has(e.id.toString())).reverse();
  if (mine.length === 0)
    return (
      <EmptyState
        title="No activity yet"
        body="Payments, collections, cancellations and expiries for this wallet's lay-bys appear here."
        action={<ButtonLink href="/connect" variant="secondary">Choose a portal</ButtonLink>}
      />
    );
  return (
    <Card>
      <ul className="m-0 list-none p-0">
        {mine.map((e, i) => {
          const d = describeEvent(e);
          const role = roleOf.get(e.id.toString())!;
          return (
            <li key={`${e.txHash}-${e.logIndex}-${e.kind}-${i}`} className="flex items-center justify-between gap-4 border-b border-divider py-3 last:border-0">
              <div className="min-w-0">
                <strong>
                  {d.title} · {items.get(e.id.toString())}
                </strong>
                <div className="text-[13px] text-subtle">{d.detail}</div>
                <div className="text-xs text-subtle">
                  {e.timestamp !== undefined && formatDateTime(e.timestamp)} · as {role}
                </div>
              </div>
              <Link href={`/${role}/laybys/${e.id}`} className="shrink-0 font-semibold text-primary hover:underline">
                #{e.id.toString()} →
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-subtle">History source: {h.data.source === "routescan" ? "Routescan index" : "Fuji RPC"}</p>
    </Card>
  );
}

export { PageTitle };
