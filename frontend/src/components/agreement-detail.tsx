"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LayByStatus, type LayBy, type LayByEvent, type TxHash, type Viewer } from "@/lib/contract/types";
import { expiryTime, heldInEscrow, statusLabel } from "@/lib/contract/status";
import { bpsToPercent, feeIfCancelled, formatAvax, parseAvax, remainingBalance, toAvaxDecimal } from "@/lib/money";
import { explorerAddress, formatDateTime, formatDuration } from "@/lib/format";
import { FUJI } from "@/lib/chain";
import { ConfirmDialog } from "./confirm-dialog";
import { ProductIcon } from "./product-card";
import { ProgressBar } from "./progress-bar";
import { Receipt } from "./receipt";
import { StatusBadge } from "./status-badge";
import { Timeline } from "./timeline";
import { useToast } from "./toast";
import { Button, ButtonLink, Card, Line, Lines, Notice } from "./ui";

export type AgreementAction =
  | { kind: "pay"; amount: bigint }
  | { kind: "collect" }
  | { kind: "cancel" }
  | { kind: "expire" };

export interface AgreementDetailProps {
  layBy: LayBy;
  events: LayByEvent[];
  viewer: Viewer;
  nowSeconds: bigint;
  graceSeconds: bigint;
  shopName?: string;
  initialAction?: "pay";
  /**
   * Phase 2 passes a handler that simulates, asks the wallet to sign and
   * waits for the receipt. Without one, confirming shows a labelled preview.
   */
  onSubmit?: (action: AgreementAction) => Promise<{ txHash: TxHash; blockNumber?: bigint }>;
}

type Dialog = "pay" | "collect" | "cancel" | "expire" | null;

export function AgreementDetail({
  layBy: l,
  events,
  viewer,
  nowSeconds,
  graceSeconds,
  shopName,
  initialAction,
  onSubmit,
}: AgreementDetailProps) {
  const toast = useToast();
  const label = statusLabel(l, nowSeconds, graceSeconds);
  const overdue = label === "Overdue";
  const active = l.status === LayByStatus.Active;
  const completed = l.status === LayByStatus.Completed;
  const remaining = remainingBalance(l);
  const customerFee = feeIfCancelled(l);
  const back = viewer === "customer" ? "/customer" : "/shop";

  // Which actions the contract would accept from this viewer right now.
  const can = {
    pay: viewer === "customer" && active && !overdue,
    collect: viewer === "customer" && completed,
    cancel: viewer === "customer" ? active : active || completed,
    expire: viewer === "shop" && overdue,
  };

  const [dialog, setDialog] = useState<Dialog>(initialAction === "pay" && can.pay ? "pay" : null);
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ title: string; lines: Array<[string, ReactNode]>; txHash?: TxHash; blockNumber?: bigint } | null>(null);

  const amount = parseAvax(amountText);
  const amountError =
    amountText === "" ? null : amount === null || amount === 0n ? "Enter a positive amount, up to 18 decimals." : amount > remaining ? `You can pay at most ${formatAvax(remaining, 18)}.` : null;

  const fee = dialog === "expire" || viewer === "customer" ? customerFee : 0n;
  const refund = l.paid - fee;

  function open(d: Dialog) {
    setError(null);
    setDialog(d);
  }

  async function confirm() {
    if (!dialog) return;
    let action: AgreementAction;
    let title: string;
    let lines: Array<[string, ReactNode]>;
    if (dialog === "pay") {
      if (amount === null || amount === 0n || amount > remaining) {
        setError(amountError ?? "Enter an amount.");
        return;
      }
      action = { kind: "pay", amount };
      title = "Payment recorded";
      lines = [["Lay-by", `#${l.id} · ${l.item}`], ["Paid", formatAvax(amount, 18)], ["Remaining after", formatAvax(remaining - amount, 18)]];
    } else if (dialog === "collect") {
      action = { kind: "collect" };
      title = "Collection confirmed";
      lines = [["Lay-by", `#${l.id} · ${l.item}`], ["Released to shop", formatAvax(l.paid, 18)]];
    } else {
      action = { kind: dialog };
      title = dialog === "expire" ? "Lay-by expired" : "Lay-by cancelled";
      lines = [["Lay-by", `#${l.id} · ${l.item}`], ["Fee to shop", formatAvax(fee, 18)], ["Refund to customer", formatAvax(refund, 18)]];
    }

    if (!onSubmit) {
      setDialog(null);
      setReceipt({ title: `${title} (preview)`, lines });
      toast("Preview only: no transaction was sent.", "info");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await onSubmit(action);
      setDialog(null);
      setReceipt({ title, lines, ...r });
      toast(title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  const footnote = onSubmit
    ? "Your wallet will ask you to sign. Network gas is paid in test AVAX."
    : "Preview: in this build nothing is signed or sent.";

  return (
    <>
      <Link href={back} className="font-semibold text-primary hover:underline">
        ← All lay-bys
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold tracking-[-1.5px] [overflow-wrap:anywhere] md:text-4xl">{l.item}</h1>
          <p className="text-muted">
            {shopName ?? "Shop"} · Agreement #{l.id.toString()}
          </p>
        </div>
        <StatusBadge label={label} />
      </div>

      {receipt && (
        <div className="mb-5">
          <Receipt
            {...receipt}
            preview={!receipt.txHash}
            actions={
              <Button variant="secondary" onClick={() => setReceipt(null)}>
                Back to agreement
              </Button>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[1.3fr_1fr]">
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <ProductIcon label={l.item} />
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.6px]">Payment progress</h2>
                <div className="text-[13px] text-subtle">Recorded instalments</div>
              </div>
            </div>
            <div className="mt-5 text-[28px] font-extrabold tracking-[-0.7px] tabular-nums">
              {formatAvax(l.paid)} <span className="text-[13px] font-normal text-subtle">of {formatAvax(l.price)}</span>
            </div>
            <ProgressBar layBy={l} />
            <Lines>
              <Line label="Remaining">{formatAvax(remaining)}</Line>
              <Line label="Held in escrow">{formatAvax(heldInEscrow(l))}</Line>
            </Lines>
            {overdue && <Notice tone="warning" className="mt-4">The payment window has closed. The shop can now settle the expiry.</Notice>}
            {completed && viewer === "customer" && (
              <Notice tone="warning" className="mt-4">Fully paid. Confirm collection only after you have the item in hand.</Notice>
            )}
            <div className="mt-[18px] flex flex-wrap gap-2.5">
              {can.pay && <Button onClick={() => open("pay")}>Pay instalment</Button>}
              {can.collect && <Button onClick={() => open("collect")}>Confirm collection</Button>}
              {can.expire && <Button onClick={() => open("expire")}>Settle expiry</Button>}
              {can.cancel && (
                <Button variant="danger" onClick={() => open("cancel")}>
                  Cancel lay-by
                </Button>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="mb-1 text-[22px] font-bold tracking-[-0.6px]">Activity timeline</h2>
            <Timeline events={events} />
          </Card>
        </div>

        <Card className="min-w-0 content-start">
          <h2 className="mb-1 text-[22px] font-bold tracking-[-0.6px]">Agreement terms</h2>
          <Lines>
            <Line label="Agreement ID" muted>#{l.id.toString()}</Line>
            <Line label="Shop wallet" muted><span className="font-mono text-[13px]">{l.shop}</span></Line>
            <Line label="Customer wallet" muted><span className="font-mono text-[13px]">{l.customer}</span></Line>
            <Line label="Full price" muted>{formatAvax(l.price, 18)}</Line>
            <Line label="Cancellation fee" muted>{bpsToPercent(l.feeBps)} of full price</Line>
            <Line label="Fee if customer cancels" muted>{formatAvax(customerFee, 18)}</Line>
            <Line label="Completion date" muted>{formatDateTime(l.completionDate)}</Line>
            <Line label="Payments close" muted>{formatDateTime(expiryTime(l, graceSeconds))}</Line>
            <Line label="Grace period" muted>{formatDuration(graceSeconds)}</Line>
            <Line label="Network" muted>{FUJI.name}</Line>
          </Lines>
          <Notice className="mt-4">Terms can&apos;t be edited after creation. If the shop cancels, the customer gets back everything paid.</Notice>
          <a href={explorerAddress(FUJI.layByAddress)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] text-primary underline">
            View the contract on Snowtrace
          </a>
        </Card>
      </div>

      <ConfirmDialog
        open={dialog === "pay"}
        title="Pay an instalment"
        confirmLabel="Review and pay"
        onConfirm={confirm}
        onClose={() => setDialog(null)}
        acknowledgement="I have reviewed the agreement and fee."
        busy={busy}
        error={error}
        footnote={footnote}
      >
        <Lines>
          <Line label="Lay-by">#{l.id.toString()} · {l.item}</Line>
          <Line label="Pays into shop wallet"><span className="font-mono text-[13px]">{l.shop}</span></Line>
          <Line label="Remaining">{formatAvax(remaining, 18)}</Line>
        </Lines>
        <label htmlFor="pay-amount" className="mt-3 grid gap-1.5 font-semibold">
          Instalment amount (test AVAX)
          <input
            id="pay-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={!!amountError}
            aria-describedby="pay-amount-help"
            className="w-full rounded-input border border-border-input bg-surface p-[11px] font-normal text-ink"
          />
        </label>
        <div id="pay-amount-help" className="mt-1 text-[13px] text-subtle">
          {amountError ? <span className="text-danger">{amountError}</span> : amount ? `Remaining after: ${formatAvax(remaining - (amount > remaining ? remaining : amount), 18)}` : "Any amount up to the remaining balance."}
        </div>
        <Button variant="secondary" className="mt-2" onClick={() => setAmountText(toAvaxDecimal(remaining))}>
          Pay full balance
        </Button>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "collect"}
        title="Confirm collection"
        confirmLabel="Release funds to shop"
        onConfirm={confirm}
        onClose={() => setDialog(null)}
        acknowledgement="I have received my item."
        busy={busy}
        error={error}
        footnote={footnote}
      >
        <Notice tone="warning">Only confirm once you physically have the item. This releases every escrowed instalment to the shop, and it can&apos;t be undone.</Notice>
        <Lines>
          <Line label="Released to shop">{formatAvax(l.paid, 18)}</Line>
        </Lines>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "cancel" || dialog === "expire"}
        title={dialog === "expire" ? "Settle expired lay-by" : "Confirm cancellation"}
        confirmLabel={dialog === "expire" ? "Settle expiry" : "Cancel lay-by"}
        tone="danger"
        onConfirm={confirm}
        onClose={() => setDialog(null)}
        busy={busy}
        error={error}
        footnote={footnote}
      >
        <Lines>
          <Line label="Total paid">{formatAvax(l.paid, 18)}</Line>
          <Line label="Fee to shop">{formatAvax(fee, 18)}</Line>
          <Line label="Refund to customer">{formatAvax(refund, 18)}</Line>
        </Lines>
        <Notice tone="warning" className="mt-3">
          {viewer === "shop" && dialog === "cancel"
            ? "A shop cancellation charges no fee: the customer gets back everything paid."
            : "The fee was fixed when the lay-by was created and can't exceed what has been paid."}{" "}
          This closes the agreement permanently.
        </Notice>
      </ConfirmDialog>
    </>
  );
}

export function NotFoundAgreement({ viewer }: { viewer: Viewer }) {
  return (
    <Card className="grid justify-items-start gap-2">
      <h1 className="text-2xl font-bold">Lay-by not found</h1>
      <p className="text-muted">There is no agreement with that ID for this wallet.</p>
      <ButtonLink href={viewer === "customer" ? "/customer" : "/shop"} variant="secondary">
        Back to dashboard
      </ButtonLink>
    </Card>
  );
}
