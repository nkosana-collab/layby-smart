import type { Address } from "./contract/types";
import { FUJI } from "./chain";

export function shortAddress(a: Address | string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Unix seconds to a fixed, timezone-explicit label so server and client render the same text. */
export function formatDateTime(seconds: bigint): string {
  const d = new Date(Number(seconds) * 1000);
  return (
    d.toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " SAST"
  );
}

export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s < 120) return `${s} seconds`;
  if (s < 7200) return `${Math.round(s / 60)} minutes`;
  if (s < 172800) return `${Math.round(s / 3600)} hours`;
  return `${Math.round(s / 86400)} days`;
}

export const explorerTx = (hash: string) => `${FUJI.explorerUrl}/tx/${hash}`;
export const explorerAddress = (a: string) => `${FUJI.explorerUrl}/address/${a}`;
