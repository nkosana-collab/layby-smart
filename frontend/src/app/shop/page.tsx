import type { Metadata } from "next";
import { AgreementTable } from "@/components/agreement-table";
import { FixtureBanner } from "@/components/states";
import { SummaryCards } from "@/components/summary-cards";
import { ButtonLink, PageTitle } from "@/components/ui";
import { PREVIEW_SHOP, graceSeconds, layBysOfShop, nowSeconds, shopName } from "@/lib/fixtures/queries";

export const metadata: Metadata = { title: "Shop dashboard" };

export default function ShopDashboard() {
  const layBys = layBysOfShop(PREVIEW_SHOP);
  return (
    <>
      <FixtureBanner />
      <PageTitle
        eyebrow="Overview"
        title={`${shopName(PREVIEW_SHOP) ?? "Shop"} dashboard`}
        lede="Manage agreements and follow what's held in escrow."
        action={<ButtonLink href="/shop/create">+ Create lay-by</ButtonLink>}
      />
      <SummaryCards layBys={layBys} viewer="shop" />
      <AgreementTable layBys={layBys} viewer="shop" nowSeconds={nowSeconds} graceSeconds={graceSeconds} />
    </>
  );
}
