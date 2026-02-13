import {
  getDashboardData,
  checkUserPermissions,
  requireAuth,
} from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import { DashboardClient } from "@/components/dashboard-client";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Church Finance",
  description:
    "View your church's financial dashboard with income, expenses, and balance summaries.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

// This is now a Server Component
export default async function DashboardPage(): Promise<JSX.Element> {
  // Require authentication first - will redirect if not authenticated
  const user = await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  // All data fetching happens on the server with church context
  const [dashboardData, permissions] = await Promise.all([
    getDashboardData(),
    checkUserPermissions(),
  ]);

  return (
    <DashboardClient
      initialData={dashboardData}
      permissions={permissions}
      serverUser={user}
    />
  );
}
