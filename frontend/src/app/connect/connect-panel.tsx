"use client";

import { Button, ButtonLink, Card, Notice } from "@/components/ui";
import { NetworkIndicator } from "@/components/wallet";
import { useToast } from "@/components/toast";
import { FUJI } from "@/lib/chain";

/**
 * Phase 1: layout and states only. Phase 2 wires the button to wagmi's
 * injected connector, checks chainId === 43113 and offers a network switch.
 */
export function ConnectPanel() {
  const toast = useToast();
  return (
    <div className="mt-5 grid gap-3">
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[22px] font-bold tracking-[-0.6px]">1. Connect</h2>
          <NetworkIndicator />
        </div>
        <p className="text-muted">
          Use a browser wallet such as Core or MetaMask, set to {FUJI.name} (chain ID {FUJI.chainId}). You&apos;ll need a little test AVAX for
          network fees.
        </p>
        <div>
          <Button onClick={() => toast("Wallet connection is added in Phase 2. This build only previews the screens.", "info")}>
            Connect wallet
          </Button>
        </div>
        <Notice>Wallet connection isn&apos;t live in this build yet. You can still explore both portals with sample data.</Notice>
      </Card>

      <h2 className="mt-3 text-[22px] font-bold tracking-[-0.6px]">2. Choose a portal</h2>
      <p className="text-muted">The same wallet can be a customer on one lay-by and a shop on another.</p>
      <div className="grid gap-3">
        <Card>
          <h3 className="mb-2 text-lg font-bold">I&apos;m a customer</h3>
          <p className="text-muted">See your lay-bys across shops, pay instalments, cancel or confirm collection.</p>
          <ButtonLink href="/customer" className="mt-3">
            Open my lay-bys
          </ButtonLink>
        </Card>
        <Card>
          <h3 className="mb-2 text-lg font-bold">I&apos;m a shop</h3>
          <p className="text-muted">Create agreements, follow payments, cancel or settle lay-bys that have expired.</p>
          <ButtonLink href="/shop" className="mt-3">
            Open shop dashboard
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
