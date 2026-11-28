/**
 * ⚠ UI FIXTURES — PHASE 1 ONLY. NOT BLOCKCHAIN DATA.
 *
 * Sample lay-bys for building screens before the contract integration
 * (Phase 2). Every page that renders these must also render <FixtureBanner />.
 * Addresses are obvious placeholders and the amounts match the pitch demo
 * script. Delete this folder when Phase 2 replaces the reads.
 */
import { LayByStatus, type Address, type LayBy, type LayByEvent } from "@/lib/contract/types";

const avax = (text: string) => {
  const [w, f = ""] = text.split(".");
  return BigInt(w) * 10n ** 18n + BigInt(f.padEnd(18, "0"));
};
const at = (iso: string) => BigInt(Math.floor(Date.parse(iso) / 1000));

export const IS_FIXTURE = true as const;

export const FIXTURE_WALLETS = {
  shopA: "0x0000000000000000000000000000000000000A01" as Address,
  shopB: "0x0000000000000000000000000000000000000B01" as Address,
  customer: "0x000000000000000000000000000000000000C001" as Address,
};

export const FIXTURE_SHOP_NAMES: Record<string, string> = {
  [FIXTURE_WALLETS.shopA]: "Sample Shop A",
  [FIXTURE_WALLETS.shopB]: "Sample Shop B",
};

/** Fixed "now" and grace period so overdue labels render the same on server and client. */
export const FIXTURE_NOW_SECONDS = at("2026-11-28T12:00:00+02:00");
export const FIXTURE_GRACE_SECONDS = 120n;

export const FIXTURE_LAYBYS: LayBy[] = [
  {
    id: 1n,
    shop: FIXTURE_WALLETS.shopA,
    customer: FIXTURE_WALLETS.customer,
    item: "TV",
    price: avax("0.10"),
    paid: avax("0.06"),
    completionDate: at("2026-12-15T12:00:00+02:00"),
    feeBps: 100,
    status: LayByStatus.Active,
  },
  {
    id: 2n,
    shop: FIXTURE_WALLETS.shopB,
    customer: FIXTURE_WALLETS.customer,
    item: "Fridge",
    price: avax("0.08"),
    paid: avax("0.02"),
    completionDate: at("2026-12-20T12:00:00+02:00"),
    feeBps: 100,
    status: LayByStatus.Active,
  },
  {
    id: 3n,
    shop: FIXTURE_WALLETS.shopA,
    customer: FIXTURE_WALLETS.customer,
    item: "Sofa",
    price: avax("0.06"),
    paid: avax("0.01"),
    completionDate: at("2026-11-28T10:00:00+02:00"),
    feeBps: 100,
    status: LayByStatus.Active,
  },
  {
    id: 4n,
    shop: FIXTURE_WALLETS.shopA,
    customer: FIXTURE_WALLETS.customer,
    item: "Washing machine",
    price: avax("0.05"),
    paid: avax("0.05"),
    completionDate: at("2026-12-01T12:00:00+02:00"),
    feeBps: 50,
    status: LayByStatus.Completed,
  },
  {
    id: 5n,
    shop: FIXTURE_WALLETS.shopB,
    customer: FIXTURE_WALLETS.customer,
    item: "School shoes",
    price: avax("0.02"),
    // The contract keeps `paid` after cancel/collect/expire; escrow is derived from status.
    paid: avax("0.01"),
    completionDate: at("2026-11-20T12:00:00+02:00"),
    feeBps: 100,
    status: LayByStatus.Cancelled,
  },
];

const created = (l: LayBy, iso: string): LayByEvent => ({
  id: l.id,
  kind: "Created",
  shop: l.shop,
  customer: l.customer,
  price: l.price,
  feeBps: l.feeBps,
  timestamp: at(iso),
});

const [tv, fridge, sofa, washer, shoes] = FIXTURE_LAYBYS;

export const FIXTURE_EVENTS: LayByEvent[] = [
  created(tv, "2026-11-20T09:10:00+02:00"),
  { id: 1n, kind: "Payment", payer: tv.customer, amount: avax("0.06"), newBalance: avax("0.04"), timestamp: at("2026-11-20T09:20:00+02:00") },
  created(fridge, "2026-11-21T14:00:00+02:00"),
  { id: 2n, kind: "Payment", payer: fridge.customer, amount: avax("0.02"), newBalance: avax("0.06"), timestamp: at("2026-11-21T14:05:00+02:00") },
  created(sofa, "2026-11-27T08:00:00+02:00"),
  { id: 3n, kind: "Payment", payer: sofa.customer, amount: avax("0.01"), newBalance: avax("0.05"), timestamp: at("2026-11-27T08:03:00+02:00") },
  created(washer, "2026-11-18T10:00:00+02:00"),
  { id: 4n, kind: "Payment", payer: washer.customer, amount: avax("0.05"), newBalance: 0n, timestamp: at("2026-11-25T16:00:00+02:00") },
  { id: 4n, kind: "Completed", totalPaid: avax("0.05"), timestamp: at("2026-11-25T16:00:00+02:00") },
  created(shoes, "2026-11-10T11:00:00+02:00"),
  { id: 5n, kind: "Payment", payer: shoes.customer, amount: avax("0.01"), newBalance: avax("0.01"), timestamp: at("2026-11-10T11:05:00+02:00") },
  { id: 5n, kind: "Cancelled", cancelledBy: shoes.shop, amountPaid: avax("0.01"), fee: 0n, refund: avax("0.01"), timestamp: at("2026-11-15T09:00:00+02:00") },
];

export function fixtureLayBy(id: bigint) {
  return FIXTURE_LAYBYS.find((l) => l.id === id);
}

export function fixtureEventsFor(id: bigint) {
  return FIXTURE_EVENTS.filter((e) => e.id === id);
}
