/**
 * ⚠ PHASE 1 FIXTURE QUERIES. Same shapes Phase 2's contract reads will return,
 * so pages only swap the import. Not blockchain data.
 */
import type { Address, LayBy } from "@/lib/contract/types";
import { FIXTURE_LAYBYS, FIXTURE_SHOP_NAMES, FIXTURE_WALLETS, fixtureEventsFor, fixtureLayBy } from "./index";

export { FIXTURE_GRACE_SECONDS as graceSeconds, FIXTURE_NOW_SECONDS as nowSeconds, FIXTURE_WALLETS } from "./index";

export const layBysOfCustomer = (customer: Address): LayBy[] => FIXTURE_LAYBYS.filter((l) => l.customer === customer);
export const layBysOfShop = (shop: Address): LayBy[] => FIXTURE_LAYBYS.filter((l) => l.shop === shop);
export const getLayBy = fixtureLayBy;
export const eventsFor = fixtureEventsFor;
export const shopName = (shop: Address) => FIXTURE_SHOP_NAMES[shop] ?? undefined;
export const shopNames: Partial<Record<string, string>> = FIXTURE_SHOP_NAMES;

/** The wallet each portal previews as. Phase 2 uses the connected address. */
export const PREVIEW_CUSTOMER = FIXTURE_WALLETS.customer;
export const PREVIEW_SHOP = FIXTURE_WALLETS.shopA;

/** Parses a route segment as a lay-by ID (positive integer). */
export function parseId(segment: string): bigint | null {
  return /^[1-9]\d{0,30}$/.test(segment) ? BigInt(segment) : null;
}
