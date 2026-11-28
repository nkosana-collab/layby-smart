import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ActiveSidebarLinks } from "./sidebar-active";

export type Portal = "customer" | "shop" | "both";
export interface SidebarLink {
  href: string;
  label: string;
  icon: string;
}

const GRID = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z";
const CLOCK = "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z";
const INFO = "M12 16v-4M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z";
const STORE = "M3 9l2-5h14l2 5M4 9v11h16V9M9 20v-6h6v6";

export const LINKS: Record<Portal, SidebarLink[]> = {
  customer: [
    { href: "/customer", label: "My lay-bys", icon: GRID },
    { href: "/activity", label: "Activity", icon: CLOCK },
    { href: "/how-it-works", label: "How it works", icon: INFO },
  ],
  shop: [
    { href: "/shop", label: "Shop dashboard", icon: GRID },
    { href: "/shop/create", label: "Create lay-by", icon: "M12 5v14M5 12h14" },
    { href: "/activity", label: "Activity", icon: CLOCK },
    { href: "/how-it-works", label: "How it works", icon: INFO },
  ],
  both: [
    { href: "/customer", label: "My lay-bys", icon: GRID },
    { href: "/shop", label: "Shop dashboard", icon: STORE },
    { href: "/activity", label: "Activity", icon: CLOCK },
    { href: "/how-it-works", label: "How it works", icon: INFO },
  ],
};

const HEADING: Record<Portal, string> = { customer: "Customer", shop: "Shop", both: "Your wallet" };

/** Pure list. `active` is filled in by ActiveSidebarLinks once the pathname is known. */
export function SidebarLinks({ links, active }: { links: SidebarLink[]; active?: string }) {
  return (
    <ul className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 md:flex-col">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={active === l.href ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-button px-3 py-2 text-xs font-semibold text-[#60586e] md:px-[17px] md:py-[11px] md:text-[15px]",
              active === l.href ? "bg-primary-soft text-primary" : "hover:bg-bg",
            )}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d={l.icon} />
            </svg>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Prototype's 210px sidebar + main column. On mobile the sidebar becomes a horizontal scroll bar. */
export function DashboardShell({ portal, children }: { portal: Portal; children: ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-1 md:grid-cols-[210px_1fr]">
      <aside className="border-b border-border bg-surface p-2 md:border-b-0 md:border-r md:px-3.5 md:py-6">
        <p className="mb-2 hidden px-[17px] text-[13px] uppercase text-subtle md:block">{HEADING[portal]}</p>
        <nav aria-label={`${HEADING[portal]} navigation`}>
          <Suspense fallback={<SidebarLinks links={LINKS[portal]} />}>
            <ActiveSidebarLinks portal={portal} />
          </Suspense>
        </nav>
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-[1350px] px-3.5 py-5 md:p-8">{children}</main>
    </div>
  );
}
