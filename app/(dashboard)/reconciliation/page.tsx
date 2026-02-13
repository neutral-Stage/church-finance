import { ReconciliationUpload } from "@/components/reconciliation/ReconciliationUpload";

// Force dynamic rendering for auth/cookies
export const dynamic = "force-dynamic";

/**
 * Bank Reconciliation page
 * Requires authentication and church context
 *
 * Note: ReconciliationUpload component should be updated to use church context
 */
export default function ReconciliationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Bank Reconciliation
        </h1>
        <p className="text-white/70">
          Upload bank statements to reconcile transactions.
        </p>
      </div>

      <ReconciliationUpload />
    </div>
  );
}
