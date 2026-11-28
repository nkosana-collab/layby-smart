"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useWallet } from "@/lib/contract/hooks";
import { FUJI } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { Button, Card, Notice, Tag, buttonClass } from "./ui";

export function NetworkIndicator() {
  const w = useWallet();
  if (w.isConnected && !w.onFuji)
    return (
      <button type="button" onClick={w.switchToFuji} className="cursor-pointer">
        <Tag className="bg-danger-bg text-danger">
          <Dot className="bg-danger" /> Wrong network · switch to Fuji
        </Tag>
      </button>
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

export function WalletButton() {
  const w = useWallet();
  if (w.isConnected && w.address)
    return (
      <button type="button" onClick={w.disconnect} className={buttonClass("secondary")} title={`${w.address} · click to disconnect`}>
        <span className="font-mono text-[13px]">{shortAddress(w.address)}</span>
      </button>
    );
  if (w.isConnecting)
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

/** Renders children only for a connected wallet on Fuji; otherwise explains what to do. */
export function WalletGate({ children, purpose }: { children: (address: `0x${string}`) => ReactNode; purpose: string }) {
  const w = useWallet();
  if (w.status === "reconnecting" || w.status === "connecting")
    return <Card className="text-muted">Reconnecting to your wallet…</Card>;
  if (!w.isConnected || !w.address)
    return (
      <Card className="grid justify-items-start gap-3">
        <h2 className="text-[22px] font-bold tracking-[-0.6px]">Connect your wallet</h2>
        <p className="text-muted">Connect a browser wallet on {FUJI.name} to {purpose}.</p>
        {w.hasInjected ? (
          <Button onClick={w.connect} disabled={w.isConnecting}>
            Connect wallet
          </Button>
        ) : (
          <Notice tone="warning">No browser wallet found. Install Core or MetaMask, then reload this page.</Notice>
        )}
        {w.connectError && <p role="alert" className="text-danger">{w.connectError.message}</p>}
      </Card>
    );
  if (!w.onFuji)
    return (
      <Card className="grid justify-items-start gap-3">
        <h2 className="text-[22px] font-bold tracking-[-0.6px]">Switch to Avalanche Fuji</h2>
        <p className="text-muted">Your wallet is on another network. Lay-by Smart only runs on Fuji (chain ID {FUJI.chainId}), with test AVAX.</p>
        <Button onClick={w.switchToFuji} disabled={w.isSwitching}>
          {w.isSwitching ? "Check your wallet…" : "Switch to Fuji"}
        </Button>
      </Card>
    );
  return <>{children(w.address)}</>;
}
