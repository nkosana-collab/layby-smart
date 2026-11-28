import type { Metadata } from "next";
import { Suspense } from "react";
import { AgreementDetail, NotFoundAgreement } from "@/components/agreement-detail";
import { AgreementListSkeleton, FixtureBanner } from "@/components/states";
import { PREVIEW_SHOP, eventsFor, getLayBy, graceSeconds, nowSeconds, parseId, shopName } from "@/lib/fixtures/queries";

export const metadata: Metadata = { title: "Lay-by details" };

// Cache Components is on: route params are request-time data, so read them inside <Suspense>.
export default function ShopLayByPage(props: PageProps<"/shop/laybys/[id]">) {
  return (
    <>
      <FixtureBanner />
      <Suspense fallback={<AgreementListSkeleton rows={1} />}>
        <Detail params={props.params} />
      </Suspense>
    </>
  );
}

async function Detail({ params }: Pick<PageProps<"/shop/laybys/[id]">, "params">) {
  const { id } = await params;
  const layById = parseId(id);
  const layBy = layById ? getLayBy(layById) : undefined;

  if (!layBy || layBy.shop !== PREVIEW_SHOP) return <NotFoundAgreement viewer="shop" />;

  return (
    <AgreementDetail
      layBy={layBy}
      events={eventsFor(layBy.id)}
      viewer="shop"
      nowSeconds={nowSeconds}
      graceSeconds={graceSeconds}
      shopName={shopName(layBy.shop)}
    />
  );
}
