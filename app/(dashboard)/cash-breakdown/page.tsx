import { getCashBreakdownData, requireAuth } from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import CashBreakdownClient from "@/components/cash-breakdown-client";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cash Breakdown | Church Finance",
  description: "View detailed cash breakdown and petty cash management.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

export default async function CashBreakdownPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  const cashBreakdownData = await getCashBreakdownData();

  return (
    <CashBreakdownClient
      initialData={cashBreakdownData}
      churchId={selectedChurch.id}
    />
  );
}
