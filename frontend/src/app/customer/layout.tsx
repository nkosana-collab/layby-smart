import { DashboardShell } from "@/components/dashboard-shell";

export default function CustomerLayout({ children }: LayoutProps<"/customer">) {
  return <DashboardShell portal="customer">{children}</DashboardShell>;
}
