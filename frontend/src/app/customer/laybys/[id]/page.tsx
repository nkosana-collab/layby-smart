import type { Metadata } from "next";
import { Suspense } from "react";
import { AgreementDetail, NotFoundAgreement } from "@/components/agreement-detail";
import { AgreementListSkeleton, FixtureBanner } from "@/components/states";
import { PREVIEW_CUSTOMER, eventsFor, getLayBy, graceSeconds, nowSeconds, parseId, shopName } from "@/lib/fixtures/queries";

export const metadata: Metadata = { title: "Lay-by details" };

// Cache Components is on: route params are request-time data, so read them inside <Suspense>.
export default function CustomerLayByPage(props: PageProps<"/customer/laybys/[id]">) {
  return (
    <>
      <FixtureBanner />
      <Suspense fallback={<AgreementListSkeleton rows={1} />}>
        <Detail params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Detail({ params, searchParams }: Pick<PageProps<"/customer/laybys/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { action } = await searchParams;
  const layById = parseId(id);
  const layBy = layById ? getLayBy(layById) : undefined;

  if (!layBy || layBy.customer !== PREVIEW_CUSTOMER) return <NotFoundAgreement viewer="customer" />;

  return (
    <AgreementDetail
      layBy={layBy}
      events={eventsFor(layBy.id)}
      viewer="customer"
      nowSeconds={nowSeconds}
      graceSeconds={graceSeconds}
      shopName={shopName(layBy.shop)}
      initialAction={action === "pay" ? "pay" : undefined}
    />
  );
}
