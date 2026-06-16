'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Church,
  Loader2,
  CheckCircle,
  Wallet,
  Users,
  ArrowRight,
  ArrowLeft,
  Receipt,
} from 'lucide-react'
import { DEFAULT_FUND_TEMPLATES } from '@/lib/onboarding'
import type { Database } from '@/types/database'

type ChurchRow = Database['public']['Tables']['churches']['Row']
type FundRow = Database['public']['Tables']['funds']['Row']

const STEPS = [
  { id: 'profile', title: 'Church Profile', icon: Church },
  { id: 'funds', title: 'Default Funds', icon: Wallet },
  { id: 'invite', title: 'Invite Team', icon: Users },
  { id: 'transaction', title: 'First Transaction', icon: Receipt },
] as const

type StepId = (typeof STEPS)[number]['id']

export default function OnboardingPage(): JSX.Element {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<StepId>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [church, setChurch] = useState<ChurchRow | null>(null)
  const [funds, setFunds] = useState<FundRow[]>([])

  const [profile, setProfile] = useState({
    name: '',
    type: 'church',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    organizationName: '',
  })

  const [inviteEmails, setInviteEmails] = useState(['', ''])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const handleCreateChurch = async () => {
    if (!profile.name.trim()) {
      setError('Church name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding/church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          type: profile.type,
          description: profile.description || null,
          address: profile.address || null,
          phone: profile.phone || null,
          email: profile.email || null,
          website: profile.website || null,
          organizationName: profile.organizationName || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to create church')
        return
      }

      setChurch(data.church)
      setFunds(data.funds ?? [])
      setStep('funds')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ churchId: church?.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to complete onboarding')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const goNext = async () => {
    if (step === 'profile') {
      if (church) {
        setStep('funds')
        return
      }
      await handleCreateChurch()
      return
    }

    if (step === 'funds') {
      setStep('invite')
      return
    }

    if (step === 'invite') {
      setStep('transaction')
      return
    }

    if (step === 'transaction') {
      await handleComplete()
    }
  }

  const goBack = () => {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev.id)
  }

  const displayFunds = funds.length > 0 ? funds : DEFAULT_FUND_TEMPLATES

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Church Finance</h1>
          <p className="text-muted-foreground">Let&apos;s set up your church in a few quick steps</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i <= stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[stepIndex].icon
                return <Icon className="h-5 w-5" />
              })()}
              {STEPS[stepIndex].title}
            </CardTitle>
            <CardDescription>
              {step === 'profile' && 'Tell us about your church'}
              {step === 'funds' && 'Review the default funds we created for you'}
              {step === 'invite' && 'Optionally invite team members (you can do this later)'}
              {step === 'transaction' && 'You are ready to record your first transaction'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'profile' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="church-name" className="text-sm font-medium">
                    Church Name *
                  </label>
                  <Input
                    id="church-name"
                    placeholder="Grace Community Church"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    disabled={loading || !!church}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="church-type" className="text-sm font-medium">
                    Type
                  </label>
                  <Select
                    value={profile.type}
                    onValueChange={(value) => setProfile((p) => ({ ...p, type: value }))}
                    disabled={loading || !!church}
                  >
                    <SelectTrigger id="church-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="church">Church</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="ministry">Ministry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="org-name" className="text-sm font-medium">
                    Organization Name (optional)
                  </label>
                  <Input
                    id="org-name"
                    placeholder="e.g. Grace Ministries Network"
                    value={profile.organizationName}
                    onChange={(e) => setProfile((p) => ({ ...p, organizationName: e.target.value }))}
                    disabled={loading || !!church}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Input
                    id="description"
                    placeholder="Brief description of your church"
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                    disabled={loading || !!church}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      disabled={loading || !!church}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="office@church.org"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      disabled={loading || !!church}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium">
                    Address
                  </label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={profile.address}
                    onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                    disabled={loading || !!church}
                  />
                </div>
              </div>
            )}

            {step === 'funds' && (
              <div className="space-y-3">
                {displayFunds.map((fund) => (
                  <div
                    key={'id' in fund ? fund.id : fund.name}
                    className="flex items-start gap-3 rounded-lg border p-4"
                  >
                    <Wallet className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{fund.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {'description' in fund ? fund.description : ''}
                      </p>
                      {'fund_type' in fund && fund.fund_type && (
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                          Type: {fund.fund_type}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="h-5 w-5 text-income ml-auto" />
                  </div>
                ))}
              </div>
            )}

            {step === 'invite' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Team invitations will be available soon. For now, you can add team members from
                  Settings after setup.
                </p>
                {inviteEmails.map((email, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium">Team member email (optional)</label>
                    <Input
                      type="email"
                      placeholder="treasurer@church.org"
                      value={email}
                      onChange={(e) => {
                        const next = [...inviteEmails]
                        next[index] = e.target.value
                        setInviteEmails(next)
                      }}
                      disabled
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 'transaction' && (
              <div className="space-y-4 text-center py-4">
                <div className="flex justify-center">
                  <div className="bg-income/10 p-4 rounded-full border border-income/30">
                    <CheckCircle className="h-12 w-12 text-income" />
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Your church is ready! After finishing setup, head to Income &amp; Expenses to
                  record your first transaction.
                </p>
                <Button variant="outline" asChild>
                  <a href="/transactions">Preview Transactions Page</a>
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={stepIndex === 0 || loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Button type="button" onClick={goNext} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {step === 'profile' ? 'Creating...' : 'Finishing...'}
                  </>
                ) : step === 'transaction' ? (
                  <>
                    Finish Setup
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                ) : step === 'invite' ? (
                  <>
                    Skip for now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
