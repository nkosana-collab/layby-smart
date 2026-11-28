import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailView } from "@/components/portal-views";
import { AgreementListSkeleton } from "@/components/states";
import { parseId } from "@/lib/format";

export const metadata: Metadata = { title: "Lay-by details" };

// Cache Components is on: route params are request-time data, so read them inside <Suspense>.
export default function CustomerLayByPage(props: PageProps<"/customer/laybys/[id]">) {
  return (
    <Suspense fallback={<AgreementListSkeleton rows={1} />}>
      <Detail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Detail({ params, searchParams }: Pick<PageProps<"/customer/laybys/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { action } = await searchParams;
  return <DetailView id={parseId(id)} viewer="customer" initialAction={action === "pay" ? "pay" : undefined} />;
}
