import { ReconciliationMatcher } from "@/components/reconciliation/ReconciliationMatcher";

// Force dynamic rendering for auth/cookies
export const dynamic = "force-dynamic";

/**
 * Reconciliation session page
 * Requires authentication and church context
 *
 * Note: ReconciliationMatcher component should be updated to use church context
 */
export default function ReconciliationSessionPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <ReconciliationMatcher sessionId={params.id} />
    </div>
  );
}
