import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderWithPath } from "@/components/site-header";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: { default: "Lay-by Smart", template: "%s · Lay-by Smart" },
  description:
    "Lay-by with its own agreement ID for every instalment, funds held in a smart contract on Avalanche Fuji. Testnet prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-ZA" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-button focus:bg-surface focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          {/* usePathname is request-time data under Cache Components; the fallback is the same header with nothing highlighted. */}
          <Suspense fallback={<SiteHeader pathname="" />}>
            <SiteHeaderWithPath />
          </Suspense>
          <div id="main" className="flex flex-1 flex-col">
            {children}
          </div>
          <footer className="px-4 py-6 text-center text-xs text-subtle">
            Lay-by Smart · Prototype on Avalanche Fuji · Test AVAX only · Not legal or financial advice
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
