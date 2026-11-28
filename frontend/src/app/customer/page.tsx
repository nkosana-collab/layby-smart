import type { Metadata } from "next";
import { AgreementTable } from "@/components/agreement-table";
import { FixtureBanner } from "@/components/states";
import { SummaryCards } from "@/components/summary-cards";
import { PageTitle } from "@/components/ui";
import { PREVIEW_CUSTOMER, graceSeconds, layBysOfCustomer, nowSeconds, shopNames } from "@/lib/fixtures/queries";

export const metadata: Metadata = { title: "My lay-bys" };

export default function CustomerDashboard() {
  const layBys = layBysOfCustomer(PREVIEW_CUSTOMER);
  return (
    <>
      <FixtureBanner />
      <PageTitle eyebrow="Overview" title="My lay-bys" lede="All your agreements, across shops." />
      <SummaryCards layBys={layBys} viewer="customer" />
      <AgreementTable layBys={layBys} viewer="customer" nowSeconds={nowSeconds} graceSeconds={graceSeconds} shopNames={shopNames} />
    </>
  );
}
