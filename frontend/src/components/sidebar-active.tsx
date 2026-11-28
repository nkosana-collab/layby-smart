"use client";

import { usePathname } from "next/navigation";
import { LINKS, SidebarLinks, type Portal } from "./dashboard-shell";

/** Adds the active highlight. usePathname is request-time data, so this renders inside <Suspense>. */
export function ActiveSidebarLinks({ portal }: { portal: Portal }) {
  const pathname = usePathname();
  const links = LINKS[portal];
  // Longest matching href wins, so /shop/create doesn't also light up /shop.
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return <SidebarLinks links={links} active={active} />;
}
