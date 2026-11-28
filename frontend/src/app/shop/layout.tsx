import { DashboardShell } from "@/components/dashboard-shell";

export default function ShopLayout({ children }: LayoutProps<"/shop">) {
  return <DashboardShell portal="shop">{children}</DashboardShell>;
}
