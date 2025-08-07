'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRightLeft, TrendingUp, TrendingDown, Banknote, History, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Fund = Database['public']['Tables']['funds']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionWithFund extends Transaction {
  fund: Fund
}

interface TransferForm {
  from_fund_id: string
  to_fund_id: string
  amount: string
  description: string
}

export default function FundsPage() {
  const { user, hasRole } = useAuth()
  const [funds, setFunds] = useState<Fund[]>([])
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithFund[]>([])
  const [loading, setLoading] = useState(true)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferForm, setTransferForm] = useState<TransferForm>({
    from_fund_id: '',
    to_fund_id: '',
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      // Fetch recent transactions for all funds
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          fund:funds(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (transactionsError) throw transactionsError

      setFunds(fundsData || [])
      setRecentTransactions(transactionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load funds data')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transferForm.from_fund_id || !transferForm.to_fund_id || !transferForm.amount || !transferForm.description) {
      toast.error('Please fill in all required fields')
      return
    }

    if (transferForm.from_fund_id === transferForm.to_fund_id) {
      toast.error('Cannot transfer to the same fund')
      return
    }

    const amount = parseFloat(transferForm.amount)
    if (amount <= 0) {
      toast.error('Transfer amount must be greater than zero')
      return
    }

    // Check if source fund has sufficient balance
    const fromFund = funds.find(f => f.id === transferForm.from_fund_id)
    if (!fromFund || fromFund.current_balance < amount) {
      toast.error('Insufficient balance in source fund')
      return
    }

    try {
      // Create two transactions: one outgoing from source fund, one incoming to destination fund
      const fromFundName = funds.find(f => f.id === transferForm.from_fund_id)?.name
      const toFundName = funds.find(f => f.id === transferForm.to_fund_id)?.name

      const transactions = [
        {
          type: 'expense' as const,
          category: 'Fund Transfer',
          amount: amount,
          description: `Transfer to ${toFundName}: ${transferForm.description}`,
          fund_id: transferForm.from_fund_id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        },
        {
          type: 'income' as const,
          category: 'Fund Transfer',
          amount: amount,
          description: `Transfer from ${fromFundName}: ${transferForm.description}`,
          fund_id: transferForm.to_fund_id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }
      ]

      const { error } = await supabase
        .from('transactions')
        .insert(transactions)

      if (error) throw error

      toast.success(`Successfully transferred ${formatCurrency(amount)} from ${fromFundName} to ${toFundName}`)
      setTransferDialogOpen(false)
      resetTransferForm()
      fetchData()
    } catch (error) {
      console.error('Error processing transfer:', error)
      toast.error('Failed to process fund transfer')
    }
  }

  const resetTransferForm = () => {
    setTransferForm({
      from_fund_id: '',
      to_fund_id: '',
      amount: '',
      description: ''
    })
  }

  // Calculate fund statistics
  const totalBalance = funds.reduce((sum, fund) => sum + fund.current_balance, 0)
  const fundWithHighestBalance = funds.reduce((max, fund) => 
    fund.current_balance > max.current_balance ? fund : max, funds[0] || { current_balance: 0, name: 'N/A' })
  const fundWithLowestBalance = funds.reduce((min, fund) => 
    fund.current_balance < min.current_balance ? fund : min, funds[0] || { current_balance: 0, name: 'N/A' })

  // Get fund-specific transactions for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const getFundActivity = (fundId: string) => {
    return recentTransactions
      .filter(t => t.fund_id === fundId && new Date(t.created_at) >= thirtyDaysAgo)
      .reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount
        else acc.expense += t.amount
        return acc
      }, { income: 0, expense: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading funds...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fund Management</h1>
          <p className="text-muted-foreground">Manage church funds and transfers</p>
        </div>
        {hasRole('Admin') && (
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetTransferForm}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Transfer Between Funds</DialogTitle>
                <DialogDescription>
                  Move money from one fund to another. This will create corresponding transactions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from_fund_id">From Fund *</Label>
                  <Select value={transferForm.from_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, from_fund_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name} ({formatCurrency(fund.current_balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to_fund_id">To Fund *</Label>
                  <Select value={transferForm.to_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, to_fund_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds
                        .filter(fund => fund.id !== transferForm.from_fund_id)
                        .map((fund) => (
                          <SelectItem key={fund.id} value={fund.id}>
                            {fund.name} ({formatCurrency(fund.current_balance)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Transfer Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    required
                  />
                  {transferForm.from_fund_id && (
                    <p className="text-xs text-muted-foreground">
                      Available: {formatCurrency(funds.find(f => f.id === transferForm.from_fund_id)?.current_balance || 0)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="Reason for this transfer..."
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Transfer Funds
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Across {funds.length} funds
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundWithHighestBalance.current_balance)}</div>
            <p className="text-xs text-muted-foreground">
              {fundWithHighestBalance.name}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lowest Balance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundWithLowestBalance.current_balance)}</div>
            <p className="text-xs text-muted-foreground">
              {fundWithLowestBalance.name}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Transactions (last 20)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fund Details */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {funds.map((fund) => {
          const activity = getFundActivity(fund.id)
          const netChange = activity.income - activity.expense
          
          return (
            <Card key={fund.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{fund.name}</CardTitle>
                    <CardDescription>{fund.description}</CardDescription>
                  </div>
                  {fund.current_balance < 1000 && (
                    <Badge variant="warning" className="ml-2">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Low
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(fund.current_balance)}</div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Last 30 Days Activity</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-green-600 font-medium">+{formatCurrency(activity.income)}</div>
                        <div className="text-xs text-muted-foreground">Income</div>
                      </div>
                      <div>
                        <div className="text-red-600 font-medium">-{formatCurrency(activity.expense)}</div>
                        <div className="text-xs text-muted-foreground">Expenses</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className={`font-medium ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                      </div>
                      <div className="text-xs text-muted-foreground">Net Change</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Fund Transactions</CardTitle>
          <CardDescription>Latest transactions across all funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Fund</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.slice(0, 10).map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="p-4">{formatDate(transaction.transaction_date)}</td>
                      <td className="p-4">{transaction.fund.name}</td>
                      <td className="p-4">
                        <Badge variant={transaction.type === 'income' ? 'success' : 'destructive'}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="p-4">{transaction.category}</td>
                      <td className="p-4 font-medium">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate">{transaction.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recent transactions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}