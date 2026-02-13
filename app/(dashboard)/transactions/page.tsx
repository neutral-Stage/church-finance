import { Suspense } from "react";
import {
  getTransactionsData,
  checkUserPermissions,
  requireAuth,
} from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import { TransactionsClient } from "@/components/transactions-client";
import { FullScreenLoader } from "@/components/ui/loader";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transactions | Church Finance",
  description: "View and manage all church income and expense transactions.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

// This is now a Server Component
export default async function TransactionsPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  // All data fetching happens on the server with church context
  const [transactionsData, permissions] = await Promise.all([
    getTransactionsData(),
    checkUserPermissions(),
  ]);

  return (
    <Suspense fallback={<FullScreenLoader message="Loading transactions..." />}>
      <TransactionsClient
        initialData={transactionsData}
        permissions={permissions}
      />
    </Suspense>
  );
}
