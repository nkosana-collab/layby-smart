import { DashboardShell } from "@/components/dashboard-shell";

export default function ActivityLayout({ children }: LayoutProps<"/activity">) {
  return <DashboardShell portal="both">{children}</DashboardShell>;
}
