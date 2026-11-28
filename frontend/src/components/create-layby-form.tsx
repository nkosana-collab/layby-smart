"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { Address, TxHash } from "@/lib/contract/types";
import { MAX_FEE_BPS, bpsToPercent, formatAvax, parseAvax, percentToBps } from "@/lib/money";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { Receipt } from "./receipt";
import { useToast } from "./toast";
import { Button, ButtonLink, Card, Line, Lines, Notice } from "./ui";

/** Arguments for createLayBy(address customer, string item, uint256 price, uint64 completionDate, uint16 feeBps). */
export interface CreateLayByArgs {
  customer: Address;
  item: string;
  price: bigint;
  completionDate: bigint;
  feeBps: number;
}

export const ITEM_MAX_LENGTH = 60;

type Errors = Partial<Record<"customer" | "item" | "price" | "fee" | "due", string>>;

export function validateCreate(
  input: { customer: string; item: string; price: string; fee: string; due: string },
  nowMs: number,
  /** The connected shop wallet. The contract rejects customer == msg.sender. */
  shop?: Address,
): { args?: CreateLayByArgs; errors: Errors } {
  // Mirrors createLayBy's requires: price > 0, valid customer != shop, future date, feeBps <= 100.
  const errors: Errors = {};
  const customer = input.customer.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(customer)) errors.customer = "Enter a wallet address: 0x followed by 40 hex characters.";
  else if (/^0x0{40}$/.test(customer)) errors.customer = "The zero address can't be a customer.";
  else if (shop && customer.toLowerCase() === shop.toLowerCase()) errors.customer = "A shop can't create a lay-by for its own wallet.";

  const item = input.item.trim();
  if (!item) errors.item = "Enter a short item label.";
  else if (item.length > ITEM_MAX_LENGTH) errors.item = `Keep the label under ${ITEM_MAX_LENGTH} characters.`;

  const price = parseAvax(input.price);
  if (price === null || price === 0n) errors.price = "Enter a price above zero, up to 18 decimals.";

  const feeBps = percentToBps(input.fee);
  if (feeBps === null || feeBps > MAX_FEE_BPS) errors.fee = "Use 0 to 1%, in steps of 0.01%.";

  const dueMs = Date.parse(input.due);
  if (!input.due || Number.isNaN(dueMs)) errors.due = "Choose a completion date and time.";
  else if (dueMs <= nowMs) errors.due = "The completion date must be in the future.";

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    args: {
      customer: customer as Address,
      item,
      price: price!,
      completionDate: BigInt(Math.floor(dueMs / 1000)),
      feeBps: feeBps!,
    },
  };
}

export function CreateLayByForm({
  graceSeconds,
  onSubmit,
}: {
  graceSeconds: bigint;
  /** Phase 2: simulate + sign createLayBy, return the new ID from the LayByCreated event. */
  onSubmit?: (args: CreateLayByArgs) => Promise<{ id: bigint; txHash: TxHash }>;
}) {
  const toast = useToast();
  const [values, setValues] = useState({ customer: "", item: "", price: "", fee: "1", due: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<CreateLayByArgs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id?: bigint; txHash?: TxHash; args: CreateLayByArgs } | null>(null);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function review(e: FormEvent) {
    e.preventDefault();
    const r = validateCreate(values, Date.now());
    setErrors(r.errors);
    if (r.args) {
      setError(null);
      setDraft(r.args);
    }
  }

  async function confirm() {
    if (!draft) return;
    if (!onSubmit) {
      setDone({ args: draft });
      setDraft(null);
      toast("Preview only: no transaction was sent.", "info");
      return;
    }
    setBusy(true);
    try {
      const r = await onSubmit(draft);
      setDone({ ...r, args: draft });
      setDraft(null);
      toast(`Lay-by #${r.id} created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-5">
        <Receipt
          title={done.id ? `Lay-by #${done.id} created` : "Lay-by created (preview)"}
          preview={!done.txHash}
          txHash={done.txHash}
          lines={summary(done.args)}
          actions={
            <>
              {done.id && <ButtonLink href={`/shop/laybys/${done.id}`}>View agreement</ButtonLink>}
              <Button variant="secondary" onClick={() => setDone(null)}>
                Create another
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <>
      <Card className="mt-5">
        <form onSubmit={review} noValidate className="grid gap-4">
          <Field id="customer" label="Customer wallet address" error={errors.customer}>
            <input id="customer" value={values.customer} onChange={set("customer")} placeholder="0x…" spellCheck={false} autoComplete="off" className={INPUT + " font-mono text-[13px]"} aria-invalid={!!errors.customer} aria-describedby="customer-msg" />
          </Field>
          <Field id="item" label="Item label" error={errors.item} help="Public on the blockchain. Describe the item only, never the customer.">
            <input id="item" value={values.item} onChange={set("item")} placeholder="e.g. Washing machine" maxLength={ITEM_MAX_LENGTH + 20} className={INPUT} aria-invalid={!!errors.item} aria-describedby="item-msg" />
          </Field>
          <Field id="price" label="Full price (test AVAX)" error={errors.price}>
            <input id="price" value={values.price} onChange={set("price")} inputMode="decimal" placeholder="0.00" className={INPUT} aria-invalid={!!errors.price} aria-describedby="price-msg" />
          </Field>
          <Field id="fee" label="Cancellation fee (%)" error={errors.fee} help="0 to 1% of the full price. Charged only if the customer cancels or the lay-by expires.">
            <input id="fee" value={values.fee} onChange={set("fee")} inputMode="decimal" className={INPUT} aria-invalid={!!errors.fee} aria-describedby="fee-msg" />
          </Field>
          <Field id="due" label="Anticipated completion date" error={errors.due} help={`Payments close ${formatDuration(graceSeconds)} after this.`}>
            <input id="due" type="datetime-local" value={values.due} onChange={set("due")} className={INPUT} aria-invalid={!!errors.due} aria-describedby="due-msg" />
          </Field>
          <Notice>A shop cancellation has no fee: the customer gets back everything paid.</Notice>
          <div>
            <Button type="submit">Review agreement →</Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={!!draft}
        title="Review new agreement"
        confirmLabel="Create lay-by"
        onConfirm={confirm}
        onClose={() => setDraft(null)}
        acknowledgement="These terms are final and public."
        busy={busy}
        error={error}
        footnote={onSubmit ? "Your wallet will ask you to sign." : "Preview: in this build nothing is signed or sent."}
      >
        {draft && (
          <Lines>
            {summary(draft).map(([k, v]) => (
              <Line key={k} label={k}>
                {v}
              </Line>
            ))}
          </Lines>
        )}
      </ConfirmDialog>
    </>
  );
}

function summary(a: CreateLayByArgs): Array<[string, ReactNode]> {
  return [
    ["Customer", <span key="c" className="font-mono text-[13px]">{a.customer}</span>],
    ["Item", a.item],
    ["Full price", formatAvax(a.price, 18)],
    ["Cancellation fee", `${bpsToPercent(a.feeBps)} (${formatAvax((a.price * BigInt(a.feeBps)) / 10_000n, 18)})`],
    ["Completion date", formatDateTime(a.completionDate)],
  ];
}

const INPUT = "w-full rounded-input border border-border-input bg-surface p-[11px] font-normal text-ink aria-[invalid=true]:border-danger";

function Field({ id, label, error, help, children }: { id: string; label: string; error?: string; help?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      <p id={`${id}-msg`} className={error ? "text-[13px] text-danger" : "text-[13px] text-subtle"}>
        {error ?? help}
      </p>
    </div>
  );
}
