'use client'

import { use, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import { DEMO_CHURCH_ID } from '@/lib/demo/constants'
import { Church, Heart, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface GivePageProps {
  params: Promise<{ churchId: string }>
}

export default function OnlineGivePage({ params }: GivePageProps) {
  const { churchId } = use(params)
  const [amount, setAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [fundType, setFundType] = useState('general')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [demoMessage, setDemoMessage] = useState('')

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const displayChurchId = isDemo ? DEMO_CHURCH_ID : churchId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)

    if (!donorName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSubmitting(true)
    setSuccess(false)
    setClientSecret(null)
    setDemoMessage('')

    try {
      const res = await fetch('/api/giving/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchId: displayChurchId,
          amount: numericAmount,
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim() || undefined,
          fundType,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Donation failed')
        return
      }

      setSuccess(true)
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
        toast.message('Payment intent ready — connect Stripe Elements to complete checkout.')
      } else {
        setDemoMessage(data.message ?? 'Thank you for your gift!')
        toast.success('Donation recorded (demo / stub mode)')
      }
    } catch {
      toast.error('Could not process donation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-muted/30 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-2">
            <Heart className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Give Online</h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
            <Church className="h-4 w-4" />
            Church ID: {displayChurchId.slice(0, 8)}…
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Make a gift</CardTitle>
            <CardDescription>
              Secure online giving{isDemo ? ' (demo mode)' : ''}. Full Stripe Connect onboarding
              is not required for this stub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-income mx-auto" />
                <p className="font-medium text-foreground">
                  {demoMessage || 'Thank you for your generous gift!'}
                </p>
                {clientSecret && (
                  <Alert>
                    <AlertDescription className="text-left text-xs break-all">
                      Stripe client secret (stub): {clientSecret.slice(0, 24)}…
                      <br />
                      Wire Stripe Elements here for production card capture.
                    </AlertDescription>
                  </Alert>
                )}
                <Button variant="outline" onClick={() => setSuccess(false)}>
                  Give again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (BDT)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  {amount && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parseFloat(amount) || 0)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donorName">Your name</Label>
                  <Input
                    id="donorName"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donorEmail">Email (optional)</Label>
                  <Input
                    id="donorEmail"
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundType">Designation</Label>
                  <Select value={fundType} onValueChange={setFundType}>
                    <SelectTrigger id="fundType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Fund</SelectItem>
                      <SelectItem value="building">Building Fund</SelectItem>
                      <SelectItem value="missions">Missions</SelectItem>
                      <SelectItem value="special">Special Offering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Note (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="In memory of…"
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    'Continue to give'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Payments are processed securely when Stripe is configured.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
