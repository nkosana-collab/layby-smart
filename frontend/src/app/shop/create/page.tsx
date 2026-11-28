import type { Metadata } from "next";
import Link from "next/link";
import { CreateView } from "@/components/portal-views";

export const metadata: Metadata = { title: "Create lay-by" };

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-[680px]">
      <Link href="/shop" className="font-semibold text-primary hover:underline">
        ← Dashboard
      </Link>
      <h1 className="my-3 text-[30px] font-bold tracking-[-1.5px] md:text-4xl">Create lay-by</h1>
      <p className="text-muted">Set the agreement terms. They can&apos;t be edited after creation.</p>
      <CreateView />
    </div>
  );
}
