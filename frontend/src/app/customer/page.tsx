import type { Metadata } from "next";
import { DashboardView } from "@/components/portal-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My lay-bys" };

export default function CustomerDashboard() {
  return (
    <>
      <PageTitle eyebrow="Overview" title="My lay-bys" lede="All your agreements, across shops. Read live from the contract." />
      <DashboardView viewer="customer" />
    </>
  );
}
