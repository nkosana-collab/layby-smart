import type { Metadata } from "next";
import { DashboardView } from "@/components/portal-views";
import { ButtonLink, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Shop dashboard" };

export default function ShopDashboard() {
  return (
    <>
      <PageTitle
        eyebrow="Overview"
        title="Shop dashboard"
        lede="Lay-bys this wallet created, and what's held in escrow."
        action={<ButtonLink href="/shop/create">+ Create lay-by</ButtonLink>}
      />
      <DashboardView viewer="shop" />
    </>
  );
}
