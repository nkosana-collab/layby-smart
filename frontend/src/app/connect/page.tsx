import type { Metadata } from "next";
import Link from "next/link";
import { ConnectPanel } from "./connect-panel";

export const metadata: Metadata = { title: "Connect wallet" };

export default function ConnectPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 md:py-9">
      <Link href="/" className="font-semibold text-primary hover:underline">
        ← Home
      </Link>
      <h1 className="my-3 text-[30px] font-bold tracking-[-1.5px] md:text-4xl">Connect your wallet</h1>
      <p className="text-muted">
        Lay-by Smart works with your own wallet on Avalanche Fuji. We never ask for your recovery phrase or private key.
      </p>
      <ConnectPanel />
    </div>
  );
}
