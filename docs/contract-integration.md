# LayBy contract — integration reference (Phase 0 audit)

Status: **deployment verified on Fuji.** The deployed bytecode is identical to the repo-root `LayBy.sol` (§1).

Everything below comes from the verified source and its compiled ABI (`contracts/deployed/LayBy.fuji.json`). It was not taken from the README. The README is only cited where it disagrees with the code (§9).

> ## ⚠ The deployed contract is the repo-root `LayBy.sol`, not `contracts/LayBy.sol`
> The team believed `contracts/LayBy.sol` was deployed. On-chain evidence shows otherwise:
> - The deployed runtime is **16,143 bytes**. `contracts/LayBy.sol` compiles to 13,568 bytes and the root `LayBy.sol` to exactly 16,143.
> - Compiling the root `LayBy.sol` (LF line endings, solc 0.8.34, optimizer off) gives runtime bytecode **and CBOR metadata hash** identical to the deployment. The metadata hash commits to the exact source text and compiler settings, so this is a verified source match.
> - The deployed dispatcher contains selector `f0cb3d67` = `moveDeposit(uint256,uint256,uint256)`, and the code contains its revert strings.
>
> Consequences:
> - **`contracts/artifacts/LayBy.json` has the wrong ABI for this address.** It lacks `moveDeposit` and `DepositMoved`. Use `contracts/deployed/LayBy.fuji.json`.
> - `contracts/LayBy.sol` and the old artifact were left untouched (they're teammates' files). The team should decide whether to sync `contracts/LayBy.sol` with what is live.

---

## 1. Deployment facts (verified 2026-11-28)

| Item | Value | Evidence |
|---|---|---|
| Network | Avalanche Fuji C-Chain, chain ID `43113` | `eth_chainId` = `0xa869` |
| Contract address | `0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936` | Supplied by the team; code present on-chain |
| Deployment tx | `0xd97baa55c786f4e2f98ba1a9bcd1ac320d7c4827cd8fe9fc979cfba1f7dd597e` (status `0x1`) | First block with code found by binary search; that block's receipt has `contractAddress` = the address |
| Deployment block | `61758464` (2026-11-28 09:32:45 UTC) | as above |
| Deployer | `0x19fd89d21966a6c9a55aa11131f82022dc749327` | tx `from` |
| `graceSeconds` | **120** | Agrees in three places: the `graceSeconds()` call, the immutable slot in the runtime code, and the constructor argument in the creation tx |
| Verified source | repo-root `LayBy.sol` (LF endings) | exact runtime and metadata match |
| Compiler | `solc 0.8.34+commit.80d5c536`, optimizer **disabled** (runs 200), default EVM version | metadata and reproduction |
| Constructor | `constructor(uint256 graceSeconds_)` | ABI |
| `nextId()` at audit time | `1`, so **no lay-bys exist yet** | live call |
| `MAX_FEE_BPS()` | `100` | live call |
| Routescan | had **not indexed** the creation tx at audit time | `getcontractcreation` returned nothing |

### Reproducing the verification

```bash
node scripts/verify-deployment.mjs --self-test
node scripts/verify-deployment.mjs 0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936
# → "VERIFIED MATCH", creationCodeMatches: true, constructorGraceSeconds: "120"
node scripts/verify-deployment.mjs 0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936 --artifact contracts/artifacts/LayBy.json
# → "MISMATCH" (proves the old artifact is not what is deployed)
```

The verifier runs **read-only**: it never signs or sends anything. Its verdicts:
- **VERIFIED MATCH**: the runtime equals the artifact with immutables masked, and the metadata hash is identical.
- **COMPATIBLE**: the executable code is identical but the metadata differs. The ABI is safe, but this is not a verified source match.
- **MISMATCH**: do not integrate.

To regenerate `contracts/deployed/LayBy.fuji.json`, compile the root `LayBy.sol` with **LF line endings**, solc 0.8.34 and the optimizer off. With CRLF endings the executable code still matches but the metadata hash doesn't.

---

## 2. Data model

### `enum Status` (exact on-chain ordering, `uint8`)

| Value | Name | Escrow held? | Terminal? |
|---|---|---|---|
| `0` | `Active` | yes, `paid` | no |
| `1` | `Completed` | yes, `paid` (== `price`) | no |
| `2` | `Collected` | no (released to shop) | yes |
| `3` | `Cancelled` | no (fee to shop, refund to customer) | yes |
| `4` | `Expired` | no (fee to shop, refund to customer) | yes |

There is **no** "Overdue" status. An `Active` agreement past `expiryTime` stays `Active` until someone settles it. The UI derives the label "Overdue — awaiting settlement" using **chain time** (§7).

### `struct LayByRecord` (returned by `getLayBy` as a tuple)

| Field | Solidity | viem TS | Notes |
|---|---|---|---|
| `shop` | `address` | `` `0x${string}` `` | `msg.sender` of `createLayBy` |
| `customer` | `address` | `` `0x${string}` `` | |
| `item` | `string` | `string` | Unvalidated free text, stored **publicly**. May be empty or very long. Render as text only |
| `price` | `uint256` | `bigint` | wei |
| `paid` | `uint256` | `bigint` | wei. **Can decrease** through `moveDeposit` (source side). Not reset on settlement: after a terminal status it's historical |
| `completionDate` | `uint64` | `bigint` | Unix seconds |
| `feeBps` | `uint16` | `number` | 0–100 |
| `status` | `uint8` | `number` | table above |

### Public state

| Getter | Returns | Notes |
|---|---|---|
| `nextId()` | `uint256` | IDs start at **1**. ID 0 never exists. **Never use this to predict a new ID**: read `LayByCreated` from the receipt |
| `MAX_FEE_BPS()` | `uint16` = 100 | constant |
| `graceSeconds()` | `uint256` = 120 | immutable |

---

## 3. Function integration matrix (12 integration functions + 3 getters)

All reverts are `require` strings (`Error(string)`). The contract defines **no custom errors**. Arithmetic panics are unreachable on the normal paths because every subtraction is guarded.

| Function (exact ABI signature) | Selector | Caller | Inputs | Output | Payable | Events | Reverts (exact strings, in check order) | Screen(s) |
|---|---|---|---|---|---|---|---|---|
| `createLayBy(address,string,uint256,uint64,uint16)` | `f3f116d5` | **Any wallet** (it becomes the shop) | `customer`, `item`, `price` wei, `completionDate` unix s, `feeBps` | `uint256 id` (read the event instead) | no | `LayByCreated` | `Price must be above zero` · `Invalid customer` (zero address **or** caller) · `Completion date must be in the future` (strict `>` block time) · `Fee exceeds 1% of price` | `/shop/create`, success screen |
| `pay(uint256)` | `c290d691` | **Customer** | `id`. Amount = **`msg.value`**; there is no amount argument | – | **yes** | `PaymentRecorded`, plus `LayByCompleted` when fully paid | `Lay-by not found` · `Only the customer can pay` · `Lay-by has expired` · `Lay-by is not active` · `Payment must be above zero` · `Payment exceeds remaining balance` | Pay dialog |
| `moveDeposit(uint256,uint256,uint256)` | `f0cb3d67` | **Customer of both agreements** | `fromId`, `toId`, `amount` wei | – | no (moves **recorded** balance only; no AVAX moves) | `DepositMoved`, plus `LayByCompleted` if `toId` becomes fully paid | `Choose two different lay-bys` · `Lay-by not found` · `Only the customer can move a deposit` · `Both lay-bys must be at the same shop` · `Both lay-bys must be active` · `Lay-by has expired` (either one) · `Amount must be above zero` · `Amount exceeds what was paid` · `Amount exceeds remaining balance` | **Not in the plan's scope yet.** See decision D6 |
| `confirmCollection(uint256)` | `bd7532b1` | **Customer** | `id` | – | no | `LayByCollected` | `Lay-by not found` · `Only the customer can confirm collection` · `Lay-by is not completed` · `Transfer to shop failed` | Collect dialog |
| `cancel(uint256)` | `40e58ee5` | Customer **or** shop | `id` | – | no | `LayByCancelled` | `Lay-by not found` · customer: `Customer can only cancel an active lay-by` · shop: `Lay-by cannot be cancelled` · others: `Only the customer or shop can cancel` · `Fee transfer failed` · `Refund transfer failed` | Cancel dialog (both portals) |
| `expire(uint256)` | `bf81bf43` | **Shop** | `id` | – | no | `LayByExpired` | `Lay-by not found` · `Only the shop can expire a lay-by` · `Lay-by is not active` · `Expiry time not reached` · `Fee transfer failed` · `Refund transfer failed` | "Settle expiry" on shop detail |
| `getLayBy(uint256)` | `f8b40e8b` | anyone (view) | `id` | `LayByRecord` | – | – | `Lay-by not found` | all detail views and cards |
| `remainingBalance(uint256)` | `265fa366` | view | `id` | `price - paid` | – | – | `Lay-by not found` | pay dialog, cards |
| `feeIfCancelled(uint256)` | `950eb639` | view | `id` | `min(price*feeBps/10000, paid)` | – | – | `Lay-by not found` | customer-cancel and expiry previews (**not** shop cancel, whose fee is always 0) |
| `expiryTime(uint256)` | `be010c40` | view | `id` | `completionDate + graceSeconds` | – | – | `Lay-by not found` | details, overdue label, pay gating |
| `layBysOfCustomer(address)` | `84d2eee8` | view | wallet | `uint256[]` in creation order | – | – | never reverts | `/customer` |
| `layBysOfShop(address)` | `f3b365de` | view | wallet | `uint256[]` | – | – | never reverts | `/shop` |
| `nextId()`, `MAX_FEE_BPS()`, `graceSeconds()` | `61b8ce8c`, `d55be8c6`, `e052b544` | view | – | see §2 | – | – | – | create form, how-it-works |

### Preview formulas (`bigint`, must match the contract)

| Preview | Formula | Prefer reading |
|---|---|---|
| Remaining | `price - paid` | `remainingBalance(id)` |
| Customer-cancel fee | `min(price * feeBps / 10000n, paid)`, **floor division** | `feeIfCancelled(id)` |
| Customer-cancel refund | `paid - fee` | – |
| Shop-cancel fee / refund | `0n` / `paid`, while Active **or** Completed | – |
| Expiry fee / refund | same as customer cancel | `feeIfCancelled(id)` |
| Collection release | `paid` (== `price`) | – |
| Max fee at creation | `price * feeBps / 10000n` | – |
| Escrow for one agreement | `status ∈ {Active, Completed} ? paid : 0n` | – |
| Move-deposit max | `min(from.paid, to.price - to.paid)` | `getLayBy` both |

**Rounding:** floor to the wei. **Fee entry:** the UI takes 0–1.00% in 0.01% steps and converts with integer string parsing (`"0.75"` → 75 bps), never with float multiplication.

---

## 4. Events (exact ABI)

| Event | Indexed (topic 1, 2, 3) | Data | Emitted by |
|---|---|---|---|
| `LayByCreated` | `id`, `shop`, `customer` | `item`, `price`, `completionDate uint64`, `feeBps uint16` | `createLayBy` |
| `PaymentRecorded` | `id`, `shop`, `payer` | `amount`, `newBalance`, `timestamp` | `pay` |
| `DepositMoved` | **`fromId`, `toId`**, `customer` | `amount`, `fromPaid`, `toPaid` | `moveDeposit` |
| `LayByCompleted` | `id`, `shop`, `customer` | `totalPaid` | `pay` **or** `moveDeposit` (same tx) |
| `LayByCollected` | `id`, `shop`, `customer` | `amountReleased` | `confirmCollection` |
| `LayByCancelled` | `id`, `cancelledBy` | `amountPaid`, `fee`, `refund` | `cancel` |
| `LayByExpired` | `id`, `shop` | `amountPaid`, `fee`, `refund` | `expire` |

Gotchas:
- **`PaymentRecorded.newBalance` is the *remaining* balance** after payment, not the paid total.
- **`DepositMoved` uses topic 2 for the destination.** A per-agreement query on topic 1 alone misses deposits moved *into* that agreement. Query both `topics: [null, ids]` and `topics: [DepositMoved, null, ids]`.
- `DepositMoved` doesn't index `shop`. Both agreements share a shop, so look it up from either record.
- `LayByCancelled` indexes `cancelledBy`, not shop or customer. Compare it with the record to label who cancelled.
- `PaymentRecorded.timestamp` = block time. Other events need a block-time lookup (cache it per block).
- An agreement can become `Completed` in a tx with **no** `PaymentRecorded` (when completed by a move).

### Deriving history

1. Get IDs from `layBysOfCustomer` / `layBysOfShop`, which are authoritative.
2. Fetch logs for `address = LAYBY`, `fromBlock = 61758464`, using (a) `topics[1] ∈ ids` and (b) `topics[0] = DepositMoved, topics[2] ∈ ids`. Decode with the ABI (`viem.decodeEventLog`).
3. Deduplicate by `(transactionHash, logIndex)` and order by `(blockNumber, logIndex)`.
4. Show only decoded logs. Never synthesise rows from `paid`.
5. **Reconcile:** `paid(id) == Σ PaymentRecorded.amount(id) + Σ DepositMoved.amount(toId = id) − Σ DepositMoved.amount(fromId = id)`. If this fails, show "history incomplete".

**Measured RPC constraint:** the public Fuji RPC rejects `eth_getLogs` ranges over **100 blocks**. History sources:
1. **Routescan's Etherscan-compatible logs API.** It returned a 200,000-block range in one keyless call during the audit. It's an indexer, not the source of truth, so step 5 still applies. It had not indexed this contract's creation tx at audit time, so check it covers our logs before relying on it.
2. **Fallback:** chunked 100-block `eth_getLogs` from block 61758464, behind a read-only, cached API route. The contract is new (~300 blocks old at audit time), so chunking is cheap at first but grows by roughly 1 request per 100 blocks.

---

## 5. Caller restrictions and "merchant mode"

- **Any wallet can call `createLayBy` and become a "shop".** There is no merchant registry, owner or allow-list. **Merchant mode is a UI mode**, not verified merchant status. Never show a "verified shop" badge.
- **No owner/admin, no pause, no upgrade, no fund recovery.**
- Permissions are enforced on-chain only. Hiding UI buttons is a convenience, not a security measure.

## 6. Payout behaviour

- Push transfers (`call{value}`) happen inside the settling tx. Status is updated first and transfers made second, and **any failed transfer reverts the whole tx**.
- `confirmCollection`: `paid` → shop.
- `cancel` (customer): `fee` → shop if `> 0`, then `paid - fee` → customer if `> 0`.
- `cancel` (shop): `paid` → customer. The shop receives nothing.
- `expire`: same split as a customer cancel.
- `moveDeposit`: **no transfer.** It only rewrites the two `paid` fields. The shop's total escrow is unchanged.
- Re-entrancy: every path checks a non-terminal status and writes state before calling out, so a re-entrant call fails that status check.

## 7. Timestamp boundaries (`t` = block time, `E = completionDate + 120`)

| Action | Rule |
|---|---|
| Create | `completionDate > t` |
| Pay / moveDeposit | `t < E` (both agreements for a move). Still allowed after `completionDate` during the 120 s grace |
| Expire | `t >= E`. No gap or overlap with paying |
| Cancel | **no time check.** A customer can cancel an overdue Active agreement, which settles like expiry |
| Completed | never expires. Collection has no time limit |

Compare against the **latest block timestamp**, not `Date.now()`. Simulate right before signing.

Because `pay` checks expiry before status, paying into a settled agreement past expiry fails with "has expired" instead of "not active". Map both to "This lay-by no longer accepts payments".

With a **120-second** grace period, an agreement becomes overdue two minutes after its completion date. That suits the demo but would be very short in real use (the README suggests 84 days).

## 8. Limitations and security concerns (no contract changes made)

| # | Issue | Impact | UI handling |
|---|---|---|---|
| L1 | Customer never confirms collection | Funds stay locked. The shop's only exit is cancelling with a full refund to the customer | Explain this on shop detail. **No** merchant "release" button |
| L2 | Shop wallet rejects AVAX | `confirmCollection`, and customer cancel/expiry with a fee, revert | Show the revert. Never promise settlement |
| L3 | **Customer** wallet rejects AVAX | Shop cancel, customer cancel and expiry with a refund revert | Same. Not mentioned in the README |
| L4 | Anyone can create agreements naming any customer | Spam or impersonation, and the customer list is unbounded | Always show the shop wallet. Show item, shop and ID before payment. Paginate |
| L5 | `item` is unbounded, unvalidated, **public** text | PII leakage, HTML injection, gas | Warn at creation. Cap length client-side. Render text only |
| L6 | Payment into the wrong valid agreement | The contract can't know intent | Confirm item, shop and ID. A customer can fix it with `moveDeposit` at the same shop |
| L7 | Expiry needs a transaction | Overdue stays `Active` | Label it "Overdue — awaiting settlement". Keep customer cancel available |
| L8 | No admin or recovery | Bugs and stuck funds need a redeploy | Document only |
| L9 | Fee rounds down | Negligible | Use `feeIfCancelled` |
| L10 | `createLayBy` return value | Unreliable off-chain | Parse `LayByCreated` from the receipt |
| **L11** | **Fee avoidance via `moveDeposit`** | A customer can move all of `paid` from agreement A to agreement B (same shop), leaving A with `paid = 0`, then cancel A with fee `min(fee, 0) = 0`. The money stays with the shop under B, but the shop loses A's fee | Product and contract decision. Document it, don't hide it |
| **L12** | `paid` can decrease | A naive history or escrow sum is wrong | Reconcile using `DepositMoved` (§4). Track shop escrow totals across agreements |
| **L13** | Source and artifact drift | `contracts/LayBy.sol` and its artifact are not what is live | Use `contracts/deployed/LayBy.fuji.json`. Team to sync the source files |

## 9. README vs. code discrepancies

| README says | Deployed code does | Consequence |
|---|---|---|
| Function table lists 9 functions, no `moveDeposit` | `moveDeposit` exists and is live | New capability plus history/escrow rules (L11, L12) |
| Events list omits `DepositMoved` | Emitted | History must decode it |
| "Solidity 0.8.20" | Deployed with 0.8.34 | Use 0.8.34 to reproduce |
| "Nobody can change … paid amount after creation" | The customer can shift `paid` between same-shop agreements | Rule 7 is not strictly true |
| `confirmCollection` "releases the price" | Releases `paid` | Equal when Completed, so no impact |
| Only a shop rejecting money is listed | A customer rejecting money also blocks refunds | L3 |
| "Contract balance back at zero" after a run | Only if every agreement is settled | Reconcile per agreement |

## 10. Environment configuration

| Variable | Value | Validation |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `43113` | must equal 43113 |
| `NEXT_PUBLIC_LAYBY_CONTRACT_ADDRESS` | `0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936` | checksummed. `getCode` must be non-empty at startup |
| `NEXT_PUBLIC_FUJI_RPC_URL` | `https://api.avax-test.network/ext/bc/C/rpc` | https URL. Public keyless endpoints only |
| `NEXT_PUBLIC_DEPLOYMENT_BLOCK` | `61758464` | positive integer |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.snowtrace.io` (team to confirm, D3) | https URL, `/tx/<hash>` and `/address/<addr>` |
| `ROUTESCAN_API_URL` (server only, optional) | `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api` | read-only history route |

No private keys, mnemonics or server signers anywhere. Every write is signed in the user's wallet.
