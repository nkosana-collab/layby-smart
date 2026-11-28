/** Decodes contract logs into LayByEvent rows. Shared by /api/history and the write pipeline. */
import { parseEventLogs, type Log } from "viem";
import { layByAbi } from "./abi.ts"; // explicit extension so node --test can import this file
import type { LayByEvent, TxHash } from "./types";

export type RawLog = Log & { timestamp?: bigint };

export function decodeLogs(logs: RawLog[]): LayByEvent[] {
  const parsed = parseEventLogs({ abi: layByAbi, logs, strict: true });
  // parseEventLogs drops logs it can't decode, so match timestamps by (tx, logIndex), not position.
  const times = new Map(logs.map((l) => [`${l.transactionHash}-${l.logIndex}`, l.timestamp]));
  const out: LayByEvent[] = [];
  parsed.forEach((p) => {
    const meta = {
      txHash: (p.transactionHash ?? undefined) as TxHash | undefined,
      timestamp: times.get(`${p.transactionHash}-${p.logIndex}`),
      blockNumber: p.blockNumber ?? undefined,
      logIndex: p.logIndex ?? undefined,
    };
    switch (p.eventName) {
      case "LayByCreated":
        out.push({ ...meta, id: p.args.id, kind: "Created", shop: p.args.shop, customer: p.args.customer, price: p.args.price, feeBps: p.args.feeBps, item: p.args.item, completionDate: p.args.completionDate });
        break;
      case "PaymentRecorded":
        out.push({ ...meta, id: p.args.id, kind: "Payment", payer: p.args.payer, amount: p.args.amount, newBalance: p.args.newBalance, timestamp: meta.timestamp ?? p.args.timestamp });
        break;
      case "LayByCompleted":
        out.push({ ...meta, id: p.args.id, kind: "Completed", totalPaid: p.args.totalPaid });
        break;
      case "LayByCollected":
        out.push({ ...meta, id: p.args.id, kind: "Collected", amountReleased: p.args.amountReleased });
        break;
      case "LayByCancelled":
        out.push({ ...meta, id: p.args.id, kind: "Cancelled", cancelledBy: p.args.cancelledBy, amountPaid: p.args.amountPaid, fee: p.args.fee, refund: p.args.refund });
        break;
      case "LayByExpired":
        out.push({ ...meta, id: p.args.id, kind: "Expired", amountPaid: p.args.amountPaid, fee: p.args.fee, refund: p.args.refund });
        break;
      case "DepositMoved":
        // One on-chain event touches two lay-bys, so it becomes two timeline rows.
        out.push({ ...meta, id: p.args.fromId, kind: "DepositMovedOut", toId: p.args.toId, amount: p.args.amount });
        out.push({ ...meta, id: p.args.toId, kind: "DepositMovedIn", fromId: p.args.fromId, amount: p.args.amount });
        break;
    }
  });
  return sortEvents(out);
}

export function sortEvents(events: LayByEvent[]): LayByEvent[] {
  return [...events].sort((x, y) => {
    const b = (x.blockNumber ?? 0n) - (y.blockNumber ?? 0n);
    if (b !== 0n) return b < 0n ? -1 : 1;
    return (x.logIndex ?? 0) - (y.logIndex ?? 0);
  });
}

/**
 * Σ payments + deposits in − deposits out must equal the stored `paid`
 * (the contract never resets `paid`). A mismatch means the history source is incomplete.
 */
export function reconcile(events: LayByEvent[], id: bigint, paid: bigint): boolean {
  let sum = 0n;
  let created = false; // a lagging index can have zero events and still "sum" to paid = 0
  for (const e of events) {
    if (e.id !== id) continue;
    if (e.kind === "Created") created = true;
    if (e.kind === "Payment" || e.kind === "DepositMovedIn") sum += e.amount;
    if (e.kind === "DepositMovedOut") sum -= e.amount;
  }
  return created && sum === paid;
}

/** JSON can't carry bigint: encode as {"$n": "123"} and back. */
export function eventsToJson(events: LayByEvent[]): string {
  return JSON.stringify(events, (_k, v) => (typeof v === "bigint" ? { $n: v.toString() } : v));
}
export function eventsFromJson(text: string): unknown {
  return JSON.parse(text, (_k, v) => (v && typeof v === "object" && typeof v.$n === "string" ? BigInt(v.$n) : v));
}
