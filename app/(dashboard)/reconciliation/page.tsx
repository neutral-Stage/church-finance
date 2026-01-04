import { ReconciliationUpload } from '@/components/reconciliation/ReconciliationUpload'

export default function ReconciliationPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Bank Reconciliation
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Upload bank statements to reconcile transactions.
                </p>
            </div>

            <ReconciliationUpload />
        </div>
    )
}
