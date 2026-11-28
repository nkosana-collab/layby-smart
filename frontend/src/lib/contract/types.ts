/**
 * Types that mirror the deployed LayBy contract exactly
 * (contracts/deployed/LayBy.fuji.json). Phase 2 fills these from
 * getLayBy / events. Never add fields the contract does not return.
 */

export type Address = `0x${string}`;
export type TxHash = `0x${string}`;

/** On-chain enum order: Active=0, Completed=1, Collected=2, Cancelled=3, Expired=4. */
export const LayByStatus = {
  Active: 0,
  Completed: 1,
  Collected: 2,
  Cancelled: 3,
  Expired: 4,
} as const;
export type LayByStatus = (typeof LayByStatus)[keyof typeof LayByStatus];

/** The `LayByRecord` struct returned by `getLayBy(id)`. */
export interface LayByRecord {
  shop: Address;
  customer: Address;
  item: string;
  /** Full price in wei. */
  price: bigint;
  /** Amount currently held for this lay-by, in wei. */
  paid: bigint;
  /** Unix seconds (uint64). */
  completionDate: bigint;
  /** Cancellation fee in basis points, 0..MAX_FEE_BPS (100 = 1%). */
  feeBps: number;
  status: LayByStatus;
}

/** A lay-by plus its agreement ID, which getLayBy does not return itself. */
export interface LayBy extends LayByRecord {
  id: bigint;
}

/** One decoded contract event, as the timeline and activity views show it. */
export type LayByEvent = { id: bigint; txHash?: TxHash; timestamp?: bigint } & (
  | { kind: "Created"; shop: Address; customer: Address; price: bigint; feeBps: number }
  | { kind: "Payment"; payer: Address; amount: bigint; newBalance: bigint }
  | { kind: "Completed"; totalPaid: bigint }
  | { kind: "Collected"; amountReleased: bigint }
  | { kind: "Cancelled"; cancelledBy: Address; amountPaid: bigint; fee: bigint; refund: bigint }
  | { kind: "Expired"; amountPaid: bigint; fee: bigint; refund: bigint }
  | { kind: "DepositMovedOut"; toId: bigint; amount: bigint }
  | { kind: "DepositMovedIn"; fromId: bigint; amount: bigint }
);

export type Viewer = "customer" | "shop";
