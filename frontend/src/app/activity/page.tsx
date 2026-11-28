import type { Metadata } from "next";
import { ActivityView } from "@/components/portal-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <PageTitle title="Activity" lede="Every contract event for your wallet's lay-bys, newest first." />
      <ActivityView />
    </>
  );
}
