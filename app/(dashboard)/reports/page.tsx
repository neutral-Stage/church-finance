import { getReportsData, requireAuth } from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import { getMonthStart, getMonthEnd } from "@/lib/utils";
import AdvancedReportsClient from "@/components/advanced-reports-client";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | Church Finance",
  description: "Generate financial reports, analyze trends, and export data.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  const now = new Date();
  const initialDateRange = {
    startDate: getMonthStart(now),
    endDate: getMonthEnd(now),
  };

  const reportsData = await getReportsData(initialDateRange);

  return (
    <AdvancedReportsClient
      initialData={reportsData}
      initialDateRange={initialDateRange}
    />
  );
}
