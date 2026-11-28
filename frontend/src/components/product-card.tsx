/**
 * Generic product icon picked from the free-text item label. It's decoration
 * only: the contract stores a label, and nothing verifies the physical item.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const ICONS: Array<[RegExp, string]> = [
  [/tv|television|screen|monitor/i, "M3 6h18v11H3zM8 21h8M12 17v4"],
  [/fridge|freezer|refrigerator/i, "M6 3h12v18H6zM6 10h12M9 6v2M9 13v3"],
  [/sofa|couch|chair|bed/i, "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2"],
  [/wash|machine|dryer/i, "M5 3h14v18H5zM5 7h14M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  [/shoe|sneaker|boot|cloth|uniform/i, "M3 17h18v-2l-6-2-2-5H8l-1 3H3z"],
  [/phone|laptop|tablet/i, "M7 3h10v18H7zM11 18h2"],
];
const BOX = "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8";

export function productIconPath(label: string) {
  return ICONS.find(([re]) => re.test(label))?.[1] ?? BOX;
}

export function ProductIcon({ label, size = "md" }: { label: string; size?: "md" | "sm" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-pic bg-pic text-primary",
        size === "md" ? "size-12 md:size-[60px]" : "size-10",
      )}
    >
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d={productIconPath(label)} />
      </svg>
    </div>
  );
}

/** Item heading block: icon, label, shop line, optional badge. */
export function ProductCard({ item, subtitle, badge }: { item: string; subtitle: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductIcon label={item} />
      <div className="min-w-0">
        <strong className="block [overflow-wrap:anywhere]">{item}</strong>
        <div className="text-[13px] text-subtle">{subtitle}</div>
        {badge && <div className="mt-1">{badge}</div>}
      </div>
    </div>
  );
}
