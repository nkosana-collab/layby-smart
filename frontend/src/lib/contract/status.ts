import { LayByStatus, type LayByRecord } from "./types";

export type StatusTone = "brand" | "success" | "warning" | "neutral" | "danger";

/** UI label. "Overdue" is derived (Active past expiryTime); it is not an on-chain status. */
export type StatusLabel = "Active" | "Completed" | "Collected" | "Cancelled" | "Expired" | "Overdue";

export const STATUS_FILTERS = ["All", "Active", "Completed", "Collected", "Cancelled", "Expired"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

const NAMES: Record<LayByStatus, Exclude<StatusLabel, "Overdue">> = {
  [LayByStatus.Active]: "Active",
  [LayByStatus.Completed]: "Completed",
  [LayByStatus.Collected]: "Collected",
  [LayByStatus.Cancelled]: "Cancelled",
  [LayByStatus.Expired]: "Expired",
};

export function statusName(status: LayByStatus) {
  return NAMES[status];
}

/** expiryTime(id) = completionDate + graceSeconds, all in unix seconds. */
export function expiryTime(l: Pick<LayByRecord, "completionDate">, graceSeconds: bigint): bigint {
  return l.completionDate + graceSeconds;
}

/** True when the shop may call expire(id): status Active and now >= expiryTime. */
export function isOverdue(
  l: Pick<LayByRecord, "status" | "completionDate">,
  nowSeconds: bigint,
  graceSeconds: bigint,
): boolean {
  return l.status === LayByStatus.Active && nowSeconds >= expiryTime(l, graceSeconds);
}

export function statusLabel(
  l: Pick<LayByRecord, "status" | "completionDate">,
  nowSeconds: bigint,
  graceSeconds: bigint,
): StatusLabel {
  return isOverdue(l, nowSeconds, graceSeconds) ? "Overdue" : NAMES[l.status];
}

export const STATUS_TONE: Record<StatusLabel, StatusTone> = {
  Active: "brand",
  Completed: "success",
  Collected: "success",
  Overdue: "warning",
  Cancelled: "neutral",
  Expired: "neutral",
};

/** Escrow shown on screen: funds stay in the contract only while Active or Completed. */
export function heldInEscrow(l: Pick<LayByRecord, "status" | "paid">): bigint {
  return l.status === LayByStatus.Active || l.status === LayByStatus.Completed ? l.paid : 0n;
}
