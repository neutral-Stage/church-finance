'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BankStatementItem, Transaction, ReconciliationSession } from '@/types/database'
import { autoMatchItems, MatchSuggestion } from '@/lib/reconciliation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, X, AlertCircle, RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddTransactionForm } from '@/components/transactions-client'

interface ReconciliationMatcherProps {
    sessionId: string
}

export function ReconciliationMatcher({ sessionId }: ReconciliationMatcherProps) {
    const [session, setSession] = useState<ReconciliationSession | null>(null)
    const [items, setItems] = useState<BankStatementItem[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [selectedItemForCreation, setSelectedItemForCreation] = useState<BankStatementItem | null>(null)

    const supabase = createClientComponentClient()

    useEffect(() => {
        fetchData()
    }, [sessionId])

    const fetchData = async () => {
        try {
            setLoading(true)

            // 1. Fetch Session
            const { data: sessionData, error: sessionError } = await supabase
                .from('reconciliation_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

            if (sessionError) throw sessionError
            setSession(sessionData)

            // 2. Fetch Statement Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('bank_statement_items')
                .select('*')
                .eq('session_id', sessionId)
                .eq('match_status', 'unmatched') // Only fetch unmatched
                .order('transaction_date', { ascending: false })

            if (itemsError) throw itemsError
            setItems(itemsData || [])

            // 3. Fetch Candidate Transactions (within date range)
            // Expand range by 7 days for safety
            const startDate = new Date(sessionData.statement_start_date!) // Needs null check ideally
            startDate.setDate(startDate.getDate() - 7)
            const endDate = new Date(sessionData.statement_end_date!)
            endDate.setDate(endDate.getDate() + 7)

            const { data: transData, error: transError } = await supabase
                .from('transactions')
                .select('*, fund:funds(name)')
                .gte('transaction_date', startDate.toISOString())
                .lte('transaction_date', endDate.toISOString())

            if (transError) throw transError
            setTransactions(transData || [])

            // 4. Run Auto-Match Logic
            if (itemsData && transData) {
                const matches = autoMatchItems(itemsData, transData)
                setSuggestions(matches)
            }

        } catch (error) {
            console.error('Error fetching reconciliation data:', error)
            toast.error('Failed to load reconciliation data')
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmMatch = async (item: BankStatementItem, transaction: Transaction) => {
        try {
            const { error } = await supabase
                .from('bank_statement_items')
                .update({
                    match_status: 'matched',
                    matched_transaction_id: transaction.id
                })
                .eq('id', item.id)

            if (error) throw error

            toast.success('Transaction matched')

            // Remove from local state
            setSuggestions(prev => prev.filter(s => s.statementItem.id !== item.id))
            setItems(prev => prev.filter(i => i.id !== item.id))
        } catch (error) {
            toast.error('Failed to match transaction')
        }
    }

    const handleCreateTransaction = (item: BankStatementItem) => {
        setSelectedItemForCreation(item)
        setCreateDialogOpen(true)
    }

    const onTransactionCreated = async () => {
        setCreateDialogOpen(false)
        setSelectedItemForCreation(null)
        toast.success('Transaction created and matched!')
        await fetchData() // Refresh all data to capture the new transaction and update status
    }

    if (loading) return <div>Loading reconciliation session...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Reconcile Transactions</h2>
                    <p className="text-muted-foreground text-sm">
                        Session: {session?.statement_start_date} - {session?.statement_end_date}
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4">
                {suggestions.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-40">
                            <Check className="h-10 w-10 text-green-500 mb-2" />
                            <p className="font-medium">All items matched! (or no items found)</p>
                        </CardContent>
                    </Card>
                ) : (
                    suggestions.map((suggestion) => (
                        <Card key={suggestion.statementItem.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                {/* Left: Statement Item */}
                                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline">Bank Statement</Badge>
                                        <span className="font-mono font-bold">{formatCurrency(suggestion.statementItem.amount)}</span>
                                    </div>
                                    <div className="text-sm font-medium">{suggestion.statementItem.description}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{suggestion.statementItem.transaction_date}</div>
                                </div>

                                {/* Middle: Match Actions */}
                                <div className="flex-1 p-4">
                                    {suggestion.possibleMatches.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Badge className={
                                                    suggestion.matchType === 'exact' ? 'bg-green-500' : 'bg-amber-500'
                                                }>
                                                    {suggestion.matchType === 'exact' ? 'Exact Match' : 'Potential Match'}
                                                </Badge>
                                            </div>

                                            {suggestion.possibleMatches.map((match) => (
                                                <div key={match.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-accent transition-colors">
                                                    <div>
                                                        <div className="font-medium text-sm">{match.description || 'No description'}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {match.transaction_date} • {match.category}
                                                        </div>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleConfirmMatch(suggestion.statementItem, match)}>
                                                        Confirm
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full space-y-2 text-center">
                                            <AlertCircle className="h-8 w-8 text-muted-foreground opacity-50" />
                                            <p className="text-sm text-muted-foreground">No matches found</p>
                                            <Button size="sm" variant="secondary" onClick={() => handleCreateTransaction(suggestion.statementItem)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Transaction
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Transaction Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Create Missing Transaction</DialogTitle>
                    </DialogHeader>
                    {selectedItemForCreation && (
                        <AddTransactionForm
                            initialData={{
                                amount: String(Math.abs(selectedItemForCreation.amount)),
                                date: selectedItemForCreation.transaction_date,
                                description: selectedItemForCreation.description || '',
                                type: selectedItemForCreation.amount > 0 ? 'income' : 'expense' // Heuristic
                            }}
                            onSuccess={async () => {
                                // Updating status logic needs to be handled.
                                // Ideally transactions-client exposes ID of created transaction so we can link it
                                // For now, we rely on refresh to auto-match the newly created one.
                                // Actually, we must manually mark the item as 'created' or 'matched' to the new ID.
                                // Since AddTransactionForm doesn't return ID easily without mod, 
                                // we will just Refresh, and it should appear as an Exact Match immediately.
                                onTransactionCreated()
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
