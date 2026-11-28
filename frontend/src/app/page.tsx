import Link from "next/link";
import { ButtonLink, Card, Eyebrow, Notice, Tag } from "@/components/ui";
import { ProductIcon } from "@/components/product-card";

const FEATURES = [
  {
    title: "One ID per lay-by",
    body: "Every agreement gets its own number. When you pay, you choose the ID, so an instalment can't land in the wrong lay-by.",
  },
  {
    title: "Money waits in escrow",
    body: "Instalments are held by a smart contract, not the shop's till. The shop is paid when you confirm you've collected the item.",
  },
  {
    title: "Fee shown up front",
    body: "The cancellation fee is fixed when the lay-by is created, capped at 1% of the price, and shown before you sign.",
  },
];

const BENEFITS = [
  {
    who: "Customers",
    points: [
      "See lay-bys from different shops in one place",
      "Pay any amount, any time, up to the balance",
      "Know the exact fee and refund before cancelling",
      "Check every payment on a public explorer",
    ],
  },
  {
    who: "Shops",
    points: [
      "Create an agreement in under a minute",
      "Each payment arrives tagged with its agreement ID",
      "Settle overdue lay-bys with the fee the customer agreed to",
      "Fewer disputes about what was paid",
    ],
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-7 md:py-9">
      <section className="grid min-h-[410px] grid-cols-1 items-center gap-11 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Eyebrow>A better way to lay-by</Eyebrow>
          <h1 className="my-3 max-w-[650px] text-[42px] font-bold leading-[1.13] tracking-[-1.5px] md:text-[58px]">
            Pay over time.
            <br />
            Collect with confidence.
          </h1>
          <p className="max-w-[560px] text-lg text-muted">
            Keep every instalment in the right place. Track your lay-bys across shops, see the terms up front and release the money
            when you collect.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink href="/connect">Get started →</ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] text-subtle">
            <Tag>Avalanche Fuji testnet</Tag>
            Prototype · Test AVAX only · No real money
          </div>
        </div>

        <div aria-hidden className="grid min-h-[330px] content-center gap-4 rounded-hero bg-[linear-gradient(145deg,#e6dbff,#f5f0ff)] p-6 md:p-9">
          <div className="rounded-float bg-surface p-5 shadow-float">
            <div className="flex items-center gap-3">
              <ProductIcon label="TV" />
              <div className="flex-1">
                <strong>TV</strong>
                <div className="text-[13px] text-subtle">Example shop · Lay-by #1</div>
              </div>
              <Tag className="bg-success-bg text-success">Example</Tag>
            </div>
            <p className="mt-5 text-muted">Progress</p>
            <div className="text-[28px] font-extrabold tracking-[-0.7px]">0.06 / 0.10 AVAX</div>
            <div className="my-3 h-[9px] overflow-hidden rounded-[20px] bg-track">
              <div className="h-full w-[60%] rounded-[20px] bg-success-bar" />
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <strong>0.04 AVAX</strong>
            </div>
          </div>
          <div className="rounded-float bg-surface p-5 shadow-float">
            <strong>Funds held in the smart contract</strong>
            <div className="text-[13px] text-subtle">Released to the shop when you confirm collection.</div>
          </div>
        </div>
      </section>

      <section aria-label="How Lay-by Smart is different" className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <h2 className="mb-2 text-lg font-bold">{f.title}</h2>
            <p className="text-muted">{f.body}</p>
          </Card>
        ))}
      </section>

      <section aria-label="Who it's for" className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {BENEFITS.map((b) => (
          <Card key={b.who}>
            <h2 className="mb-3 text-[22px] font-bold tracking-[-0.6px]">For {b.who.toLowerCase()}</h2>
            <ul className="m-0 grid gap-2 pl-5 text-muted">
              {b.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <Notice tone="warning" className="mt-8">
        <strong>Prototype on a test network.</strong> Lay-by Smart runs on Avalanche Fuji with test AVAX, which has no value. It hasn&apos;t
        been audited. The contract can&apos;t see whether an item was handed over, so only confirm collection once you have it. Refunds
        follow the contract&apos;s rules, which are explained on{" "}
        <Link href="/how-it-works" className="underline">
          How it works
        </Link>
        . Don&apos;t enter names, ID numbers or other personal details: item labels are public.
      </Notice>
    </div>
  );
}
