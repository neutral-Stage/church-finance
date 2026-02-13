import { getFundsPageData, requireAuth } from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import FundsClient from "@/components/funds-client";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fund Management | Church Finance",
  description:
    "Manage church funds, track balances, and handle fund transfers.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

export default async function FundsPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  const fundsPageData = await getFundsPageData();

  return <FundsClient initialData={fundsPageData} />;
}
