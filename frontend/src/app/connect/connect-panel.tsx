"use client";

import { ButtonLink, Card, Notice } from "@/components/ui";
import { NetworkIndicator, WalletGate } from "@/components/wallet";
import { useWallet } from "@/lib/contract/hooks";
import { FUJI } from "@/lib/chain";

export function ConnectPanel() {
  const w = useWallet();
  return (
    <div className="mt-5 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold tracking-[-0.6px]">1. Connect</h2>
        <NetworkIndicator />
      </div>
      <WalletGate purpose="use Lay-by Smart">
        {(address) => (
          <Card className="grid gap-2">
            <p className="text-muted">Connected on {FUJI.name}:</p>
            <p className="font-mono text-[13px] [overflow-wrap:anywhere]">{address}</p>
            <Notice>You&apos;ll need a little test AVAX for network fees. Every action asks your wallet to sign; we never see your keys.</Notice>
          </Card>
        )}
      </WalletGate>

      <h2 className="mt-3 text-[22px] font-bold tracking-[-0.6px]">2. Choose a portal</h2>
      <p className="text-muted">The same wallet can be a customer on one lay-by and a shop on another.</p>
      <div className="grid gap-3">
        <Card>
          <h3 className="mb-2 text-lg font-bold">I&apos;m a customer</h3>
          <p className="text-muted">See your lay-bys across shops, pay instalments, cancel or confirm collection.</p>
          <ButtonLink href="/customer" className="mt-3" aria-disabled={!w.isConnected}>
            Open my lay-bys
          </ButtonLink>
        </Card>
        <Card>
          <h3 className="mb-2 text-lg font-bold">I&apos;m a shop</h3>
          <p className="text-muted">Create agreements, follow payments, cancel, or settle lay-bys that have expired.</p>
          <ButtonLink href="/shop" className="mt-3" aria-disabled={!w.isConnected}>
            Open shop dashboard
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
