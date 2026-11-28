import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailView } from "@/components/portal-views";
import { AgreementListSkeleton } from "@/components/states";
import { parseId } from "@/lib/format";

export const metadata: Metadata = { title: "Lay-by details" };

// Cache Components is on: route params are request-time data, so read them inside <Suspense>.
export default function ShopLayByPage(props: PageProps<"/shop/laybys/[id]">) {
  return (
    <Suspense fallback={<AgreementListSkeleton rows={1} />}>
      <Detail params={props.params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/shop/laybys/[id]">, "params">) {
  const { id } = await params;
  return <DetailView id={parseId(id)} viewer="shop" />;
}
