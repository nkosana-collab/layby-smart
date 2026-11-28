import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Notice, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "How it works" };

const STEPS: Array<[string, string]> = [
  ["The shop creates an agreement", "The shop sets the customer's wallet, an item label, the full price, a cancellation fee of up to 1%, and a completion date. These terms can't be changed afterwards."],
  ["The customer pays instalments", "Each payment names one agreement ID and can be any amount up to the remaining balance. Only the customer's wallet can pay."],
  ["The money stays in escrow", "Instalments are held by the smart contract. The shop can't withdraw them early, and neither can we."],
  ["The customer collects", "Once it's fully paid, the customer confirms collection after receiving the item, and the contract releases the money to the shop."],
  ["Cancelling", "While a lay-by is active, the customer can cancel and pays only the fee they agreed to (never more than what they've paid). If the shop cancels, the customer gets back everything paid."],
  ["Expiry", "After the completion date plus a short grace period, payments stop. The shop can then settle the lay-by: the agreed fee goes to the shop, and the rest is refunded to the customer."],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-7 md:py-9">
      <Link href="/" className="font-semibold text-primary hover:underline">
        ← Home
      </Link>
      <div className="mt-3">
        <PageTitle title="How Lay-by Smart works" lede="One agreement ID. Terms you see up front. Payments anyone can check." />
      </div>
      <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title}>
            <Card className="h-full">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-primary-soft font-bold text-primary">
                {i + 1}
              </span>
              <h2 className="mb-2 mt-3 text-[22px] font-bold tracking-[-0.6px]">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </h2>
              <p className="text-muted">{body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <h2 className="mb-2 text-[22px] font-bold tracking-[-0.6px]">What the contract can&apos;t do</h2>
        <ul className="m-0 grid gap-2 pl-5 text-muted">
          <li>It can&apos;t see whether an item was handed over. That&apos;s why only the customer can confirm collection.</li>
          <li>It doesn&apos;t verify who a shop is. Any wallet can create a lay-by, so always check the shop wallet shown on the agreement.</li>
          <li>If a customer never confirms collection, the money stays in the contract. The shop&apos;s option is to cancel with a full refund.</li>
          <li>A customer can move a deposit between two of their lay-bys at the same shop. Moving money out of a lay-by avoids that lay-by&apos;s fee.</li>
        </ul>
      </Card>

      <Notice tone="warning" className="mt-6">
        Testnet prototype, not legal or financial advice. Uses test AVAX only. Don&apos;t enter personal information: wallet addresses and
        item labels are public on the blockchain.
      </Notice>
      <div className="mt-6">
        <ButtonLink href="/connect">Get started →</ButtonLink>
      </div>
    </div>
  );
}
