# Lay-by Smart

A smart contract that runs a lay-by agreement between a shop and a customer on the Avalanche Fuji testnet. Built for the Avalanche Uncharted hackathon (WeThinkCode_ Johannesburg, 28 November 2026).

**Test tokens only. No real funds and no personal data.** Only wallet addresses and made-up item labels are used. This is a prototype, not legal advice.

## The problem

A customer can have lay-bys at several partner stores. A cashier sometimes puts an instalment into the wrong lay-by, and then nobody can prove what was paid, so shop and customer end up disputing the balance. Paper records and shop systems can be edited or lost.

## What the contract does

Every lay-by gets a unique ID, and every payment must name that ID, so money can only be credited to the lay-by it was meant for. The instalments sit in the contract until the customer confirms collection, so the shop cannot quietly keep or alter them. The rules for fees, refunds and expiry are enforced by code and visible to both sides from the moment the lay-by is created.

### Lifecycle

| Status | Meaning | How it gets there |
|---|---|---|
| Active | Open, instalments accepted | The shop creates the lay-by |
| Completed | Fully paid, ready for collection | The final instalment is paid |
| Collected | Customer has the item | The customer confirms collection and the shop is paid |
| Cancelled | Closed by customer or shop, refund settled | `cancel` |
| Expired | Not completed in time, settlement done | The shop calls `expire` after the expiry time |

### Rules

1. **Escrow.** Instalments are held by the contract. The shop receives the money only when the customer confirms collection, or receives a fee when one is due.
2. **Customer-only payments.** Only the customer's wallet can pay into a lay-by. Overpayment is rejected.
3. **Fee.** Set at creation in basis points of the full price, at most 100 (1%), and never more than the amount paid. Fee = price x feeBps / 10,000. It is readable before the first payment, and paying implies acceptance.
4. **Customer cancels** (only while Active): the shop receives the fee and the customer receives the rest.
5. **Shop cancels** (while Active or Completed): the customer is refunded in full, with no fee. This also covers a shop that cannot supply a fully paid item.
6. **Expiry.** The expiry time is the anticipated completion date plus a grace period set at deployment. From the expiry time onward, no payment is accepted. The shop can then trigger expiry, which settles like a customer cancellation (fee to the shop, the rest refunded).
7. **No admin.** Nobody can change a lay-by's price, fee, dates or paid amount after creation.

### Functions

| Function | Who | What it does |
|---|---|---|
| `createLayBy(customer, item, price, completionDate, feeBps)` | Shop | Creates a lay-by and returns its ID |
| `pay(id)` (payable) | Customer | Adds an instalment; the status becomes Completed when the balance reaches zero |
| `confirmCollection(id)` | Customer | Releases the price to the shop |
| `cancel(id)` | Customer or shop | Cancels with the rules above |
| `expire(id)` | Shop | Settles a lay-by after its expiry time |
| `getLayBy(id)`, `remainingBalance(id)`, `feeIfCancelled(id)`, `expiryTime(id)` | Anyone | Read lay-by data |
| `layBysOfCustomer(address)`, `layBysOfShop(address)` | Anyone | List lay-by IDs |

All amounts are in wei (1 AVAX = 10^18 wei). Events: `LayByCreated`, `PaymentRecorded`, `LayByCompleted`, `LayByCollected`, `LayByCancelled`, `LayByExpired`.

## South African lay-by law

The design follows section 62 of the Consumer Protection Act as far as a prototype can: money paid stays the consumer's until delivery (escrow), a penalty is capped at 1% of the full price and disclosed up front, termination only happens after a grace period, and the customer is refunded everything paid minus the lawful fee. The Act gives 60 business days; the contract cannot know public holidays, so real use would set the grace period to 84 calendar days (7,257,600 seconds) as a stand-in. The 1% cap sits in the regulations, so check the official text before relying on it.

## Deployment

| Item | Value |
|---|---|
| Network | Avalanche Fuji C-Chain (chain ID 43113) |
| Contract address | `<PASTE CONTRACT ADDRESS>` |
| Explorer | `<PASTE EXPLORER LINK TO THE CONTRACT>` |
| Deployed from | `<PASTE DEPLOYER ADDRESS>` |
| Grace period (demo) | 120 seconds |
| Tools | Solidity 0.8.20, Remix IDE, MetaMask |

## Demo run on Fuji

Four test accounts: Shop A, Shop B, Customer, Stranger. A full run ends with the contract balance back at zero.

| Step | Action | Transaction |
|---|---|---|
| 1 | Shop A creates a lay-by for a "TV" | `<LINK>` |
| 2 | Shop B creates a lay-by for a "Fridge" for the same customer | `<LINK>` |
| 3 | Shop A creates a "Sofa" lay-by with a short completion date | `<LINK>` |
| 4 | Customer pays an instalment into each of the three | `<LINKS>` |
| 5 | Customer pays off the TV (status Completed) | `<LINK>` |
| 6 | Customer confirms collection; Shop A is paid | `<LINK>` |
| 7 | Customer cancels the Fridge; fee to Shop B, rest refunded | `<LINK>` |
| 8 | After the expiry time, Shop A expires the Sofa; fee to Shop A, rest refunded | `<LINK>` |

Rejections (Stranger paying, overpaying, paying after expiry, expiring too early) are shown in Remix and with the wallet's "likely to fail" warning, because the wallet will not send a transaction it knows will revert.

## How to run it yourself

1. Add Fuji to a wallet (chain ID 43113) and get test AVAX from the Avalanche testnet faucet.
2. Open Remix, create `LayBy.sol` from this repo, and compile it with Solidity 0.8.20 or higher.
3. Deploy with a grace period in seconds (for example `120`), using the Browser Extension environment on Fuji.
4. Follow the demo table above. Set the Value box to `0` Wei for every call except `pay`.

## Tests

Every rule was checked in the Remix simulator and then on Fuji, including: wrong callers, overpayment, payments into closed lay-bys, all three cancellation paths, expiry timing, separate balances across lay-bys and shops, a re-entrancy attempt (blocked), and a failed transfer (the whole action reverts).

## Known limitations

- A shop that is a contract refusing incoming money would make a customer's cancellation revert, because the fee is sent directly. A withdrawal balance would close this gap.
- A customer who never confirms collection leaves the money locked. A shop claim after a set number of days is not built.
- 60 business days is approximated as 84 calendar days.
- Equivalent goods, interest on refunds, double refunds for failed supply, and checking hospitalisation or death are handled off-chain.
- No front end. Everything runs through Remix and the block explorer.

## With more time

A checkout screen that lists a customer's active lay-bys, a verified-store registry, withdrawal-based payouts, automatic expiry through an automation service, a shop claim after a set number of days, and stablecoin payments.