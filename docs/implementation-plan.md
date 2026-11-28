# Lay-by Smart — implementation plan

Companion to `docs/contract-integration.md`. Phase 0 output. This document makes no code changes.

## 1. Repository today (audited 2026-11-28, `main` @ `081c471`)

| Path | Contents |
|---|---|
| `LayBy.sol` (repo root) | **The source that is actually deployed** at `0xb124…2936` (bytecode and metadata verified). Includes `moveDeposit` |
| `contracts/LayBy.sol` | Older variant **without** `moveDeposit`. **Not deployed**, despite what the team assumed |
| `contracts/artifacts/LayBy.json` | Remix output for `contracts/LayBy.sol`. **Wrong ABI for the live address** |
| `contracts/deployed/LayBy.fuji.json` | **New (Phase 0).** Verified ABI, bytecode, address, deployment tx and block. The frontend's only ABI source |
| `contracts/ReentrancyShop.sol` | Attack harness used for the re-entrancy test |
| `contracts/.states/vm-osaka/` | Remix **local simulator** state, not Fuji |
| `docs/design/layby-smart-prototype.html` | Approved UI prototype (copied in during Phase 0) |
| `scripts/verify-deployment.mjs` | Read-only deployment verifier (Phase 0) |

There is no frontend, backend, package manager lockfile, CI or hosting config. Commit `971ec74` mentions frontend/backend folders, but none are tracked in git. Node 24 / npm 11 / pnpm 11 are available locally.

## 2. Proposed structure (additive, nothing existing moves)

```
frontend/                         Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
  src/app/
    page.tsx                      /               landing
    how-it-works/page.tsx         /how-it-works
    connect/page.tsx              /connect        wallet + Fuji check + role choice
    customer/layout.tsx           shared customer sidebar layout
    customer/page.tsx             /customer
    customer/laybys/[id]/page.tsx
    shop/layout.tsx
    shop/page.tsx                 /shop
    shop/create/page.tsx
    shop/laybys/[id]/page.tsx
    activity/page.tsx
    api/history/route.ts          READ-ONLY event history (cache + Routescan/RPC fallback)
  src/components/                 header, sidebar, status-badge, progress-bar, product-card,
                                  agreement-table, timeline, confirm-dialog, receipt, states/*
  src/lib/contract/
    abi.ts                        generated `as const` ABI from contracts/deployed/LayBy.fuji.json
    status.ts                     enum mapping 0..4, derived "Overdue" label
    reads.ts                      typed hooks: useLayBy, useCustomerLayBys, useShopLayBys …
    writes.ts                     simulate → sign → wait → decode → invalidate
    money.ts                      bigint helpers: parseAvax, formatAvax, percent↔bps
    events.ts                     log decoding, dedupe, ordering
  src/lib/config.ts               zod-validated env
  .env.example
scripts/verify-deployment.mjs
docs/
```

Why a single Next.js app: the plan's "backend" amounts to read-only event indexing. Next.js route handlers in the same app cover that without a second service or deployment. No database is needed.

The ABI comes from the artifact through a tiny generator script (`frontend/scripts/gen-abi.mjs` → `src/lib/contract/abi.ts`). viem infers argument and return types from an `as const` ABI, so a call to a method that doesn't exist becomes a compile error.

## 3. Screen mapping from the prototype

| Prototype screen | Route | Contract calls |
|---|---|---|
| `home` | `/` | none |
| `how` | `/how-it-works` | `graceSeconds()` (displayed value) |
| `role` ("Choose your demo wallet") | `/connect` | becomes a **real** wallet connection plus role choice. The prototype's simulated wallets are removed |
| `dashboard` (customer) | `/customer` | `layBysOfCustomer`, then batched `getLayBy` |
| `dashboard` (shop) | `/shop` | `layBysOfShop`, then batched `getLayBy` |
| `detail` | `/customer/laybys/[id]`, `/shop/laybys/[id]` | `getLayBy`, `expiryTime`, `feeIfCancelled`, history |
| `pay` + `confirm(pay)` | pay dialog | `remainingBalance`, simulate and send `pay` with `value` |
| `create` + `confirm(create)` | `/shop/create` | simulate and send `createLayBy`, parse `LayByCreated` |
| `confirm(collect/cancel/expire)` | dialogs | `confirmCollection` / `cancel` / `expire` |
| `receipt` | receipt component | tx receipt + decoded events |
| `activity` | `/activity` | history API |

Prototype behaviours to change for accuracy:
- Escrow on the detail page is `paid` for Active/Completed, 0 otherwise. This already matches, keep it.
- "Released to shop" in the collect dialog shows `a.price`. Use `paid` (equal in practice).
- The grace period text is hard-coded to "120 seconds". Read it from `graceSeconds()`.
- "Expiry due" comes from a hard-coded flag. Derive it from block time against `expiryTime(id)`.
- Fee input validation is already 0–1% in 0.01% steps. Keep it, converting to bps without floats.
- Remove the "Screen feedback" widget, "Reset demo" and "Switch demo wallet" from production.

## 4. Decisions needed from the team

| # | Decision | Recommendation |
|---|---|---|
| D1 | ~~Contract address~~ **Resolved.** `0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936`, block 61758464, verified against the root `LayBy.sol` | – |
| D6 | **`moveDeposit` in the UI?** It's live, and it's the README's core "instalment went to the wrong lay-by" remedy, but it isn't in the plan's scope | Phase 2 reads/history **must** handle `DepositMoved` regardless. Recommend a small customer "Move funds to another lay-by at this shop" dialog in Phase 4, plus disclosure of the fee-avoidance property (L11) |
| D7 | Sync `contracts/LayBy.sol` and `contracts/artifacts/` with what is deployed? | The team should do this so the repo stops contradicting the chain. I haven't touched those files |
| D2 | **History source.** The public RPC caps `eth_getLogs` at 100 blocks | Primary: Routescan logs API via a read-only `/api/history` route with short caching. Fallback: chunked RPC queries from `DEPLOYMENT_BLOCK`. Always reconcile `Σ payments == paid` |
| D3 | Explorer for links | `testnet.snowtrace.io` (Routescan-backed, and the same data as D2). Alternative: the Avalanche explorer |
| D4 | Package manager | npm, the lowest-friction option for three teammates |
| D5 | Parallel branches | The plan suggests `feat/contract-integration`, `feat/merchant-portal`, `feat/customer-portal`. This branch (`feat/layby-smart-webapp`) can hold Phase 0/1 and the shared foundation that the others branch from |

## 5. Phase sequence

| Phase | Output | Blocked by |
|---|---|---|
| 0 Audit | this doc, `contract-integration.md`, verifier, `contracts/deployed/LayBy.fuji.json` | done |
| 1 Foundation | Next.js app, design tokens from the prototype, all routes and shared components with isolated, labelled fixtures | **done, awaiting team review** (`frontend/README.md`) |
| 2 Integration | wagmi/viem config, reads, write pipeline, history API (including `DepositMoved`) | D2 |
| 3 Merchant | dashboard, create, cancel, expire | 2 |
| 4 Customer | dashboard, pay, collect, cancel (+ move deposit if D6 approved) | 2, D6 |
| 5 History | timeline, activity, receipts, transparency | 2, D2 |
| 6 Testing | `docs/test-report.md` with real Fuji tx links | funded test wallets controlled by the team |
| 7 Deploy | README, Vercel (only with permission) | team approval |

## 6. Design tokens extracted from the prototype

| Token | Value | Use |
|---|---|---|
| `--primary` | `#6130c6` | buttons, brand, active nav |
| `--primary-soft` | `#eee8fb` | tags, active sidebar item, step dots |
| `--primary-text` | `#5933a0` / `#49318a` | tag text, secondary button text |
| `--bg` | `#f7f6fa` | page background |
| `--surface` | `#ffffff` | cards, header, sidebar |
| `--hero-gradient` | `linear-gradient(145deg,#e6dbff,#f5f0ff)` | landing visual |
| `--ink` | `#201b32` | headings, body |
| `--muted` | `#655e76` / `#736b83` | paragraphs, captions |
| `--border` | `#e7e2ee` (inputs `#dcd5e7`) | card, header, sidebar borders |
| `--success` | bg `#e1f4e9`, fg `#206942`, bar `#34a36e` | Completed/Collected, progress |
| `--warning` | bg `#fff0d7`/`#fff2dc`, fg `#8d590e`/`#895b19` | overdue, collect warnings |
| `--danger` | bg `#fce8e7`/`#fff0ef`, fg `#a33b36` | cancel, errors |
| `--neutral` | bg `#eeeef2`, fg `#555` | Cancelled/Expired |
| Radius | cards 15px, buttons 9px, inputs 8px, hero 30px, pills 20px | |
| Type | system-ui, 15px/1.5. Hero h1 58px (42px mobile), h1 36px, h2 22px | |
| Layout | max width 1200px. Dashboard grid `210px 1fr`. Mobile breakpoint 760px with the sidebar becoming a horizontal scroll bar | |

Status badges always include a text label, never colour alone.
