'use client'

import { useState } from 'react'
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  PieChart,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { formatChurchCurrency, type ChurchFinancialData } from './church-types'

interface ChurchDetailDrawerProps {
  church: ChurchFinancialData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChurchDetailDrawer({ church, open, onOpenChange }: ChurchDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {church?.name} - Financial Details
          </SheetTitle>
          <SheetDescription>Comprehensive financial overview and activity details</SheetDescription>
        </SheetHeader>

        {church && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="funds">Funds</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <GlassCard variant="success">
                  <GlassCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="text-xl font-bold text-income">
                          {formatChurchCurrency(church.funds.total_balance)}
                        </p>
                      </div>
                      <DollarSign className="h-6 w-6 text-income" />
                    </div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard variant="info">
                  <GlassCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Income</p>
                        <p className="text-xl font-bold text-primary">
                          {formatChurchCurrency(church.funds.total_income)}
                        </p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard variant="warning">
                  <GlassCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-bold text-pending">
                          {formatChurchCurrency(church.funds.total_expenses)}
                        </p>
                      </div>
                      <TrendingDown className="h-6 w-6 text-pending" />
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Fund Overview</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Funds:</span>
                      <span className="text-foreground">{church.funds.total_funds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Funds:</span>
                      <span className="text-income">{church.funds.active_funds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Position:</span>
                      <span
                        className={
                          church.funds.total_income - church.funds.total_expenses > 0
                            ? 'text-income'
                            : 'text-destructive'
                        }
                      >
                        {formatChurchCurrency(
                          church.funds.total_income - church.funds.total_expenses
                        )}
                      </span>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Recent Activity (30 days)</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transactions:</span>
                      <span className="text-foreground">
                        {church.recent_activity.transactions_last_30_days}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offerings:</span>
                      <span className="text-foreground">
                        {church.recent_activity.offerings_last_30_days}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Bills:</span>
                      <span
                        className={
                          church.recent_activity.bills_pending > 0
                            ? 'text-pending'
                            : 'text-foreground'
                        }
                      >
                        {church.recent_activity.bills_pending}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outstanding Advances:</span>
                      <span
                        className={
                          church.recent_activity.advances_outstanding > 0
                            ? 'text-destructive'
                            : 'text-foreground'
                        }
                      >
                        {church.recent_activity.advances_outstanding}
                      </span>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </div>
            </TabsContent>

            <TabsContent value="funds" className="mt-4 space-y-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Fund Distribution by Type</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  {Object.keys(church.funds.fund_types).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(church.funds.fund_types).map(([type, amount]) => {
                        const percentage =
                          church.funds.total_balance > 0
                            ? (amount / church.funds.total_balance) * 100
                            : 0
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize text-muted-foreground">{type}:</span>
                              <span className="text-foreground">
                                {formatChurchCurrency(amount)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-muted-foreground">No fund data available</p>
                  )}
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="activity" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <GlassCard variant="info">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Transaction Activity
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="py-6 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {church.recent_activity.transactions_last_30_days}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Transactions in last 30 days
                      </p>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard variant="success">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Offering Activity
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="py-6 text-center">
                      <div className="text-2xl font-bold text-income">
                        {church.recent_activity.offerings_last_30_days}
                      </div>
                      <p className="text-sm text-muted-foreground">Offerings in last 30 days</p>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </div>

              {(church.recent_activity.bills_pending > 0 ||
                church.recent_activity.advances_outstanding > 0) && (
                <GlassCard variant="warning">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Action Items
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-2">
                    {church.recent_activity.bills_pending > 0 && (
                      <div className="flex items-center justify-between rounded border border-pending/30 bg-pending/15 p-3">
                        <span className="text-pending">Pending Bills</span>
                        <span className="font-bold text-pending">
                          {church.recent_activity.bills_pending}
                        </span>
                      </div>
                    )}
                    {church.recent_activity.advances_outstanding > 0 && (
                      <div className="flex items-center justify-between rounded border border-destructive/30 bg-destructive/15 p-3">
                        <span className="text-destructive">Outstanding Advances</span>
                        <span className="font-bold text-destructive">
                          {church.recent_activity.advances_outstanding}
                        </span>
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Church Information</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="text-foreground">{church.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="capitalize text-foreground">{church.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <p className={church.is_active ? 'text-income' : 'text-destructive'}>
                        {church.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">User Count</Label>
                      <p className="text-foreground">{church.user_count || 0}</p>
                    </div>
                    {church.established_date && (
                      <div>
                        <Label className="text-muted-foreground">Established</Label>
                        <p className="text-foreground">
                          {new Date(church.established_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-foreground">
                        {new Date(church.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {church.description && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1 text-foreground">{church.description}</p>
                    </div>
                  )}

                  {church.address && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="mt-1 text-foreground">{church.address}</p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {church.phone && (
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="text-foreground">{church.phone}</p>
                      </div>
                    )}
                    {church.email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="text-foreground">{church.email}</p>
                      </div>
                    )}
                  </div>
                </GlassCardContent>
              </GlassCard>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}
