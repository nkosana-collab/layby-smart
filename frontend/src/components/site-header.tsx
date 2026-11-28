"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { NetworkIndicator, WalletButton } from "./wallet";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/customer", label: "My lay-bys" },
  { href: "/shop", label: "Shop" },
  { href: "/activity", label: "Activity" },
];

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-[-0.8px] md:text-[21px]">
      <span aria-hidden className="grid size-[29px] place-items-center rounded-[10px] bg-primary text-white md:size-9">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="4" y="9" width="16" height="11" rx="2" />
          <path d="M8 9V7a4 4 0 0 1 8 0v2" />
        </svg>
      </span>
      Lay-by Smart
    </Link>
  );
}

export function SiteHeaderWithPath() {
  return <SiteHeader pathname={usePathname()} />;
}

export function SiteHeader({ pathname }: { pathname: string }) {
  // Remember the path the menu was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="flex h-16 items-center justify-between gap-3 px-3 md:h-[74px] md:px-[5%]">
        <Brand />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={cn(
                "rounded-button px-3 py-2 font-semibold text-muted hover:text-primary",
                isActive(n.href) && "bg-primary-soft text-primary",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex">
            <NetworkIndicator />
          </span>
          <WalletButton />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-button border border-border-button bg-surface text-primary-deep lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-border px-3 pb-3 lg:hidden">
          <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-button px-3 py-2.5 font-semibold text-muted",
                    isActive(n.href) && "bg-primary-soft text-primary",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 sm:hidden">
            <NetworkIndicator />
          </div>
        </nav>
      )}
    </header>
  );
}
