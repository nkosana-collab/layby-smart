"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10">
      <ErrorState
        title="This page couldn't load"
        body="Something went wrong while showing this page. Your lay-bys and funds aren't affected."
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </div>
  );
}
