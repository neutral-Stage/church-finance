'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  buildGivingStatementInput,
  downloadGivingStatementPdf,
} from '@/lib/giving-statements'
import type { MemberContribution } from '@/lib/server-data'
import { Church, Download, FileText, Loader2, Shield } from 'lucide-react'

interface PortalContribution {
  id: string
  service_date: string
  type: string
  amount: number
  fund_name: string
  notes?: string
}

interface PortalPayload {
  member: { id: string; name: string }
  churchName: string
  year: number
  contributions: PortalContribution[]
  totalAmount: number
}

function MemberPortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortalPayload | null>(null)

  const loadPortal = useCallback(async () => {
    if (!token) {
      setError('No portal token provided. Use the secure link from your church email.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/member-portal?token=${encodeURIComponent(token)}&year=${year}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Unable to load giving history')
        setData(null)
        return
      }

      setData(json as PortalPayload)
    } catch {
      setError('Could not connect to the member portal. Please try again.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [token, year])

  useEffect(() => {
    void loadPortal()
  }, [loadPortal])

  const handleDownloadStatement = () => {
    if (!data) return

    const contrib: MemberContribution = {
      member: {
        id: data.member.id,
        name: data.member.name,
      },
      contributions: data.contributions,
      total_amount: data.totalAmount,
      contribution_count: data.contributions.length,
      last_contribution_date: data.contributions[0]?.service_date ?? '',
      missing_months: 0,
      missing_months_list: [],
      average_monthly_amount: 0,
      average_annual_amount: data.totalAmount,
      months_with_contributions: data.contributions.length,
    }

    const input = buildGivingStatementInput(contrib, data.churchName, Number(year))
    downloadGivingStatementPdf(input)
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Member Portal
            </CardTitle>
            <CardDescription>
              Open the secure link from your church to view your giving history.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
            <Church className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Member Giving Portal</h1>
          <p className="text-muted-foreground text-sm">
            Read-only access via secure magic link
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{data?.member.name ?? 'Your giving'}</CardTitle>
              <CardDescription>{data?.churchName ?? 'Loading church…'}</CardDescription>
            </div>
            <div className="w-32">
              <Label htmlFor="year" className="text-xs text-muted-foreground">
                Tax year
              </Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading your giving history…
              </div>
            )}

            {error && !loading && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {data && !loading && !error && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total for {year}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(data.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.contributions.length} contribution
                      {data.contributions.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button onClick={handleDownloadStatement} disabled={data.contributions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download statement
                  </Button>
                </div>

                {data.contributions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No contributions recorded for {year}.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Type</th>
                          <th className="p-3 font-medium">Fund</th>
                          <th className="p-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.contributions.map((c) => (
                          <tr key={`${c.id}-${c.service_date}`} className="border-b last:border-0">
                            <td className="p-3">{formatDate(c.service_date)}</td>
                            <td className="p-3 capitalize">{c.type}</td>
                            <td className="p-3">{c.fund_name}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(c.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center pt-2">
                  This portal is read-only. Contact your church treasurer to update records.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MemberPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MemberPortalContent />
    </Suspense>
  )
}
