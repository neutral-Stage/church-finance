import { ReconciliationMatcher } from '@/components/reconciliation/ReconciliationMatcher'

export default function ReconciliationSessionPage({ params }: { params: { id: string } }) {
    return (
        <div className="space-y-6">
            <ReconciliationMatcher sessionId={params.id} />
        </div>
    )
}
