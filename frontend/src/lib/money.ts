/**
 * AVAX amounts are bigint wei (18 decimals) end to end. No floats, so
 * what we show is exactly what the contract will compute.
 */
import type { LayByRecord } from "./contract/types";

export const WEI_PER_AVAX = 10n ** 18n;
export const BPS_DENOMINATOR = 10_000n;
export const MAX_FEE_BPS = 100;

/** Formats wei as AVAX, trimming trailing zeros. `maxDecimals` rounds down. */
export function formatAvax(wei: bigint, maxDecimals = 4): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / WEI_PER_AVAX;
  let frac = (abs % WEI_PER_AVAX).toString().padStart(18, "0").slice(0, maxDecimals);
  frac = frac.replace(/0+$/, "");
  const wholeText = whole.toLocaleString("en-ZA");
  return `${negative ? "-" : ""}${wholeText}${frac ? "." + frac : ""} AVAX`;
}

/** Exact wei as a plain decimal string for inputs ("0.04"), no grouping or unit. */
export function toAvaxDecimal(wei: bigint): string {
  const whole = wei / WEI_PER_AVAX;
  const frac = (wei % WEI_PER_AVAX).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Parses a decimal AVAX string ("0.02") to wei. Returns null if invalid or over 18 decimals. */
export function parseAvax(input: string): bigint | null {
  const text = input.trim();
  if (!/^\d+(\.\d+)?$/.test(text) && !/^\.\d+$/.test(text)) return null;
  const [whole = "0", frac = ""] = text.split(".");
  if (frac.length > 18) return null;
  return BigInt(whole || "0") * WEI_PER_AVAX + BigInt(frac.padEnd(18, "0") || "0");
}

/** "1" or "0.25" (percent, max two decimals) to basis points. Null if invalid. */
export function percentToBps(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function bpsToPercent(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = (bps % 100).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""}%`;
}

export function remainingBalance(l: Pick<LayByRecord, "price" | "paid">): bigint {
  return l.price > l.paid ? l.price - l.paid : 0n;
}

/** Same formula as the contract's feeIfCancelled(id): min(price * feeBps / 10000, paid). */
export function feeIfCancelled(l: Pick<LayByRecord, "price" | "paid" | "feeBps">): bigint {
  const fee = (l.price * BigInt(l.feeBps)) / BPS_DENOMINATOR;
  return fee > l.paid ? l.paid : fee;
}

/** Fee cap stated in the agreement (before limiting to what has been paid). */
export function feeCap(l: Pick<LayByRecord, "price" | "feeBps">): bigint {
  return (l.price * BigInt(l.feeBps)) / BPS_DENOMINATOR;
}

/** Whole percent paid, 0..100, for progress bars. */
export function percentPaid(l: Pick<LayByRecord, "price" | "paid">): number {
  if (l.price === 0n) return 0;
  return Number((l.paid * 100n) / l.price);
}
