# Lay-by Smart — pitch script and demo run sheet

**Format:** 5 minutes = **2:00 talk** + **3:00 live demo**.
**Pace:** about 145 words a minute. Each script below is about 280 words. Read it aloud with a timer twice before the pitch.
**Decks:** Version B, *Lay-by Smart pitch* (Bona format), is the recommended main deck. Version A, *Lay-Smart*, is the alternative.

---

## The three anchors (say each one at least twice in 5 minutes)

1. **“Every instalment names its lay-by.”** Each payment goes to one agreement ID, never the cashier's guess.
2. **“The money waits in the contract, not the till.”** The shop is paid only when the customer confirms collection.
3. **“Fee fixed up front, never more than 1%.”** That is the CPA's cap, enforced in code.

If a judge remembers only three sentences, make it these.

---

## Version B — Lay-by Smart pitch (Bona format) · 2:00

| Time | Slide | Say this | On-screen anchor |
|---|---|---|---|
| 0:00–0:08 | 1 · Cover | “Hi, we’re **[team name]**. This is Lay-by Smart: lay-by where every instalment lands in the lay-by it was meant for.” | **Every instalment lands in the lay-by it was meant for** |
| 0:08–0:28 | 2 · The problem | “Picture a customer paying off a TV at one shop and a fridge at another. She pays R500 for the TV, and the cashier credits it to the fridge. The only record is a paper slip or the shop’s own system. So it’s her word against theirs.” | The red arrow: **meant for the TV, credited to the fridge** |
| 0:28–0:46 | 3 · How big | “Seventy-two percent of South Africans say their money got tighter this year, and lay-by is how families buy without debt. The Consumer Protection Act caps the cancellation fee at one percent. But it’s enforced on paper, and stores have still said ‘no refund’.” | **72%** and **1%** |
| 0:46–1:10 | 4 · Our solution | “Lay-by Smart gives every lay-by its own ID on Avalanche. The shop creates it. The customer pays into that ID only. The money waits in a smart contract, not the till. The shop is paid when the customer confirms she has the item. And the fee is fixed on day one, never more than one percent.” | The five-step pill row; table row **Who holds the money → The contract** |
| 1:10–1:25 | 5 · Six ideas | “In plain words: a smart contract is a program that holds money and can only follow its rule. Everyone signs with their own wallet. Every payment is a public receipt. And nobody can change the rule. Not even us.” | **Can’t be changed: no admin, no withdraw** |
| 1:25–1:38 | 6 · Business model | “Shops pay a small monthly plan, and we share the fee of a regulated partner that moves rand in and out. Later, retail groups license it. We never hold the money.” | **We never hold the money** |
| 1:38–1:50 | 7 · Why us | “It’s live on Avalanche today, and we checked that the deployed code matches our source exactly. It’s built on the CPA’s own rules. Every instalment names its lay-by.” | **Every instalment names its lay-by.** |
| 1:50–2:00 | 8 · Three tries | “Let us show you. Watch for three things the contract refuses, and one payout it allows.” → **switch to the demo** | The three ✗ and one ✓ |

Slides 9–11 (who can do what, honest limits, live vs in progress) are **backup for Q&A only**.

## Version A — Lay-Smart (original style) · 2:00

| Time | Slide | Say this |
|---|---|---|
| 0:00–0:06 | 1 · Lay-Smart | “I’m **[presenter]**, and this is Lay-Smart.” |
| 0:06–0:14 | 2 · We have a PROBLEM | “An instalment goes into the wrong lay-by, and nobody can prove what was paid.” |
| 0:14–0:32 | 3 · CPA awareness | “One customer, many shops, and paper records. Yet the Consumer Protection Act already says how lay-by should work: the money stays yours until delivery, the fee is capped at one percent and shown up front, and you get the rest back. The rules exist. Nobody enforces them.” |
| 0:32–0:47 | 4 · Lay-Smart | “Lay-Smart puts those rules in a smart contract: CPA in code, every lay-by in one place, blockchain proof for every payment, and the freedom to pay what you can.” |
| 0:47–1:02 | 5 · Flexibility | “Life changes. Shoes today, medicine tomorrow. So you can pay any amount, move a deposit to another lay-by at the same shop, and cancel knowing the fee first.” |
| 1:02–1:14 | 6 · Escrow | “The money doesn’t go to the shop. It waits in the contract, and the shop is paid when you confirm collection.” |
| 1:14–1:28 | 7 · Lifecycle | “Active, completed, collected. Or it ends early: you cancel and pay at most one percent, the shop cancels and refunds everything, or it expires after the grace period.” |
| 1:28–1:40 | 8 · Hypothesis | “Our bet: when every instalment has its own ID and a public receipt, wrong-lay-by disputes stop being one word against another. The risks are wallets, rand on-ramps, and shops agreeing to wait.” |
| 1:40–1:50 | 9 · Check it yourself | “It’s live on Avalanche Fuji, and the code on-chain matches our source exactly. No admin, no withdraw button.” |
| 1:50–2:00 | 10 · Conclusion | “Right lay-by, fair rules, public proof. Let us show you.” → **switch to the demo** |

---

## The demo · 3:00, step by step

### Before you go on stage (at least 15 minutes before)

| # | Prep | Why |
|---|---|---|
| P1 | Four MetaMask accounts on **Fuji**, each with test AVAX: **Shop A**, **Shop B**, **Customer**, **Stranger** | Every role signs with its own wallet |
| P2 | Shop A creates **TV #1**: price **0.10 AVAX**, fee **1%**, completion date tomorrow. The customer pays **0.06**. | Shows a lay-by in progress |
| P3 | Shop B creates **Fridge #2** for the same customer: **0.08 AVAX**, 1%, completion tomorrow. The customer pays **0.02**. | Shows two shops on one dashboard |
| P4 | **About 10 minutes before**, Shop A creates **Sofa #3**: **0.06 AVAX**, 1%, completion **5 minutes from now**. The customer pays **0.01**. | Grace is 120 s, so it is overdue by demo time without waiting on stage |
| P5 | Open tabs: the app (customer view), the app (shop view, Shop A), and Snowtrace at `0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936` | No typing URLs live |
| P6 | Fallback: a screen recording of a full run, plus Remix with the contract loaded at the address | If the Wi-Fi, RPC or wallet fails |

Tell the judges: *“We created these three lay-bys before the session. Everything you see next is live.”*

### On stage

| Time | Step | Who | What to do | What the judges see | Say (anchor) |
|---|---|---|---|---|---|
| 0:00–0:20 | 1 · One dashboard | Customer | Open **My lay-bys** | TV #1 (Shop A), Fridge #2 (Shop B), Sofa #3 (Shop A, *Overdue*) | “One customer, two shops, three lay-bys, each with its own ID.” |
| 0:20–0:45 | 2 · Pay the right lay-by | Customer | TV #1 → **Pay 0.02** → confirm dialog → sign | Dialog shows **#1, Shop A’s wallet, 0.02 left after**. Receipt with a Snowtrace link. TV goes to 0.08 / 0.10 | “**Every instalment names its lay-by.** Only #1 moved. The fridge didn’t.” |
| 0:45–1:00 | 3 · Try 1: stranger pays | Stranger | Switch wallet, open TV #1, try to pay | Rejected before signing: **“Only the customer can pay”** | “The contract said no, not our app.” |
| 1:00–1:12 | 4 · Try 2: overpay | Customer | Enter **0.05** on TV #1 (only 0.02 left) | **“Payment exceeds remaining balance”** | “You can’t overpay into a lay-by.” |
| 1:12–1:32 | 5 · Fully paid ≠ shop paid | Customer | **Pay remaining balance (0.02)** | Status **Completed**. Escrow still **0.10** | “**The money waits in the contract, not the till.** Fully paid, but the shop isn’t paid yet.” |
| 1:32–1:52 | 6 · Collection = payout | Customer | **Confirm collection**, tick “I received my item”, sign | Status **Collected**. **0.10 released to Shop A** | “The one payout: only when she has the TV.” |
| 1:52–2:05 | 7 · Try 3: expire early | Shop B | Open Fridge #2 → **Settle expiry** | **“Expiry time not reached”** | “The shop can’t end it early.” |
| 2:05–2:25 | 8 · Fair cancellation | Customer | Fridge #2 → **Cancel** → preview → sign | Preview: paid **0.02**, fee **0.0008** (1% of 0.08), refund **0.0192** | “**Fee fixed up front, never more than 1%.** She sees it before she signs.” |
| 2:25–2:45 | 9 · Expiry settles itself | Shop A | Sofa #3 (overdue) → **Settle expiry** → sign | Fee **0.0006** to Shop A, refund **0.0094** to the customer. Status **Expired** | “Time ran out, so the rule split the money. Nobody negotiated.” |
| 2:45–3:00 | 10 · Check it yourself | Anyone | Switch to the Snowtrace tab, open the contract’s events | Each payment, collection, cancellation and expiry as its own public record | “Every step you just saw is on Avalanche. Check it yourself. Thank you.” |

**About the three tries:** the app simulates each transaction before asking for a signature, so the rejections appear without sending a failing transaction or spending gas. If you demo from Remix instead, MetaMask shows its “likely to fail” warning. Cancel there and read the reason aloud.

### If something breaks

| Problem | Do this | Say |
|---|---|---|
| Wallet pop-up doesn’t appear | Click the MetaMask icon. The request is waiting there | “The wallet is asking her to sign.” |
| RPC slow or failing | Go to step 10 (Snowtrace) and show the transactions made during prep | “Here are the same steps from earlier today.” |
| Sofa isn’t overdue yet | Skip step 9 and show the countdown | “The shop can settle it in N seconds. The contract checks the clock.” |
| App broken | Play the screen recording, narrating the same anchors | — |

---

## Numbers you can quote (and where they come from)

| Claim | Source | Status |
|---|---|---|
| Cancellation penalty **may not exceed 1%** of the full price | CPA Regulation 34 (acts.co.za) | Quote as fact |
| A penalty applies only if the consumer cancels, or hasn't completed **60 business days** after the anticipated completion date, and must be disclosed up front | CPA section 62(4) (acts.co.za) | Quote as fact |
| Some retailers told cancelling customers “no refund” or charged **10%** | TimesLIVE consumer column, 2017 | Say “have”, not “do”. It’s an older report |
| Stretched shoppers use lay-by **instead of credit** to avoid debt | Kantar, reported by BusinessDay, 2024 | Qualitative. Don’t attach a number |
| **72%** say their finances stagnated or worsened in the past year | SA Customer Experience Report 2026 (2,000 consumers), via Mzansi Urban Report | **Check the original report before quoting** |
| Grace period **120 seconds**, fee cap **100 bps** | Read from the deployed contract | Verified on-chain |
| Contract **0xb124…2936**, block **61,758,464** | Fuji RPC, bytecode verified against `LayBy.sol` | Verified |

We found no reliable published figure for **how many South Africans use lay-by**. Don’t quote one unless the team finds a sourced number.

---

## Likely questions (30-second answers)

- **“What if the customer never confirms collection?”** The money stays in the contract. The shop’s option is to cancel and refund in full. A timed shop claim is on our roadmap. *(Backup: Honest limits)*
- **“Can anyone pretend to be a shop?”** Yes, any wallet can create a lay-by. That’s why the app always shows the shop’s wallet, and why we never show a “verified” badge. A shop registry is next. *(Backup: Who can do what)*
- **“Why not just a database?”** A database is still controlled by whoever runs it. Here neither the shop nor we can move the money or change the fee, and the customer can check it herself.
- **“Real rand?”** Test AVAX today. Real use needs a regulated partner to move rand in and out (business model, slide 6).
- **“Privacy?”** Only wallet addresses and made-up item labels go on-chain, and they’re public. No names or ID numbers. The app warns shops about this.
- **“Can a customer dodge the fee?”** Moving a deposit to another lay-by at the same shop can avoid one lay-by’s fee. The money still stays with that shop. We document it as a known limit.
