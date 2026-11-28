import type { ReactNode } from "react";
import type { TxHash } from "@/lib/contract/types";
import { explorerTx } from "@/lib/format";
import { Card, Line, Lines, Notice } from "./ui";

export interface ReceiptProps {
  title: string;
  lines: Array<[label: string, value: ReactNode]>;
  /** Present once a real transaction is mined (Phase 2+). */
  txHash?: TxHash;
  blockNumber?: bigint;
  /** Phase 1 previews have no hash and say so. */
  preview?: boolean;
  actions?: ReactNode;
}

export function Receipt({ title, lines, txHash, blockNumber, preview = false, actions }: ReceiptProps) {
  return (
    <Card className="grid gap-3 text-center md:p-10">
      <div aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="text-left">
        <Lines>
          {lines.map(([k, v]) => (
            <Line key={k} label={k} muted>
              {v}
            </Line>
          ))}
          {txHash && (
            <Line label="Transaction" muted>
              <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" className="font-mono text-[13px] text-primary underline">
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
              </a>
            </Line>
          )}
          {blockNumber !== undefined && (
            <Line label="Block" muted>
              {blockNumber.toLocaleString("en-ZA")}
            </Line>
          )}
        </Lines>
      </div>
      {preview && (
        <Notice tone="warning">Preview only. No transaction was sent, so there is no hash or Snowtrace link.</Notice>
      )}
      {actions && <div className="flex flex-wrap justify-center gap-2.5">{actions}</div>}
    </Card>
  );
}
