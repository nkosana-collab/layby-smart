/**
 * Wallet button and network indicator. Presentational in Phase 1: they take
 * the connection state as props. Phase 2 feeds them from wagmi
 * (useAccount / useChainId) without changing these props.
 */
import Link from "next/link";
import type { Address } from "@/lib/contract/types";
import { shortAddress } from "@/lib/format";
import { buttonClass, Tag } from "./ui";

export type NetworkState = "fuji" | "wrong-network" | "disconnected";

export function NetworkIndicator({ state = "fuji" }: { state?: NetworkState }) {
  if (state === "wrong-network")
    return (
      <Tag className="bg-danger-bg text-danger">
        <Dot className="bg-danger" /> Wrong network · switch to Fuji
      </Tag>
    );
  return (
    <Tag>
      <Dot className="bg-primary" /> Fuji testnet
    </Tag>
  );
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block size-2 rounded-full ${className}`} />;
}

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; address: Address; roleLabel?: string };

export function WalletButton({ wallet = { status: "disconnected" } }: { wallet?: WalletState }) {
  if (wallet.status === "connected")
    return (
      <span className={buttonClass("secondary", "cursor-default")} title={wallet.address}>
        {wallet.roleLabel ? `${wallet.roleLabel} · ` : ""}
        <span className="font-mono text-[13px]">{shortAddress(wallet.address)}</span>
      </span>
    );
  if (wallet.status === "connecting")
    return (
      <button type="button" disabled className={buttonClass("secondary")}>
        Waiting for wallet…
      </button>
    );
  return (
    <Link href="/connect" className={buttonClass("secondary")}>
      Connect wallet
    </Link>
  );
}
