# Lay-by Smart — frontend

Next.js 16 (App Router, Cache Components on), React 19, TypeScript, Tailwind v4. No extra runtime dependencies yet.

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm test             # money/fee helpers (node --test, no framework)
npm run typecheck    # next typegen + tsc
npm run lint
npm run build
```

## Phase 1 status: screens only, sample data

Every portal page shows a **Sample data** banner. Its lay-bys come from `src/lib/fixtures/`, not the blockchain, and confirming an action shows a receipt marked *preview* with no transaction hash. Wallet connection is a placeholder.

## Where things are

| Path | What |
|---|---|
| `src/lib/contract/types.ts` | `LayByRecord`, `LayByStatus` (0–4), event union. Mirrors `contracts/deployed/LayBy.fuji.json` |
| `src/lib/contract/status.ts` | Status labels, derived **Overdue**, `expiryTime`, `heldInEscrow` |
| `src/lib/money.ts` | bigint wei helpers. `feeIfCancelled` uses the contract's formula |
| `src/lib/chain.ts` | Fuji chain ID, RPC, explorer, contract address, deployment block |
| `src/lib/fixtures/` | ⚠ Phase 1 sample data. `queries.ts` uses the same function names Phase 2 will read from the contract |
| `src/components/` | Header and mobile menu, sidebar, wallet button, network indicator, status badge, progress bar, product card, summary cards, agreement table, timeline, confirm dialog, receipt, skeleton/empty/error states, toasts |
| `scripts/money.test.ts` | Unit tests, including the pitch demo's fee and refund amounts |

## Phase 2 hand-off

- Replace the `@/lib/fixtures/queries` imports with contract reads. Components already take bigint contract data as props.
- `AgreementDetail` and `CreateLayByForm` take an optional `onSubmit`. Pass simulate → sign → wait → decode, and the preview mode switches off on its own.
- `WalletButton` / `NetworkIndicator` take state props. Feed them from wagmi.
- Then delete `src/lib/fixtures/` and `FixtureBanner`.

## Contract facts the UI relies on

- `paid` is **not** reset after cancel, collect or expire. Escrow is `paid` only while Active or Completed (`heldInEscrow`).
- "Overdue" isn't an on-chain status: it means Active and `now >= completionDate + graceSeconds`. Then `pay` reverts and the shop may `expire`.
- `createLayBy` rejects price 0, the zero address, `customer == msg.sender`, past dates and `feeBps > 100`. The create form checks the same rules.
