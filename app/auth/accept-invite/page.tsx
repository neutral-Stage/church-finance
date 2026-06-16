'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Church, Loader2, CheckCircle2, XCircle } from 'lucide-react'

type AcceptState = 'idle' | 'loading' | 'success' | 'error' | 'needs_auth'

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const token = searchParams.get('token')

  const [state, setState] = useState<AcceptState>('idle')
  const [error, setError] = useState('')
  const [churchName, setChurchName] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!token) {
      setState('error')
      setError('No invitation token provided. Check the link in your email.')
      return
    }

    if (!user) {
      setState('needs_auth')
      return
    }

    const acceptInvite = async () => {
      setState('loading')
      setError('')

      try {
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          setChurchName(data.churchName ?? 'your church')
          setState('success')
          setTimeout(() => router.push('/dashboard'), 2500)
        } else {
          setState('error')
          setError(data.error ?? 'Failed to accept invitation')
        }
      } catch {
        setState('error')
        setError('Unable to connect to the server. Please try again.')
      }
    }

    acceptInvite()
  }, [authLoading, user, token, router])

  const loginHref = token
    ? `/auth/login?redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`
    : '/auth/login'

  const signupHref = token
    ? `/auth/signup?redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`
    : '/auth/signup'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full border border-border">
                {state === 'success' ? (
                  <CheckCircle2 className="h-12 w-12 text-income" />
                ) : state === 'error' ? (
                  <XCircle className="h-12 w-12 text-destructive" />
                ) : (
                  <Church className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              {state === 'success' ? 'Welcome!' : 'Accept Invitation'}
            </CardTitle>
            <CardDescription>
              {state === 'success'
                ? `You've joined ${churchName}`
                : 'Join your church on Church Finance'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {(state === 'idle' || state === 'loading' || authLoading) && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Processing your invitation...</p>
              </div>
            )}

            {state === 'needs_auth' && (
              <>
                <Alert>
                  <AlertDescription>
                    Sign in or create an account with the email address that received this invitation.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full h-11">
                    <Link href={loginHref}>Sign In</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-11">
                    <Link href={signupHref}>Create Account</Link>
                  </Button>
                </div>
              </>
            )}

            {state === 'success' && (
              <Alert className="border-income/30 bg-income/10">
                <AlertDescription className="text-income">
                  Redirecting you to the dashboard...
                </AlertDescription>
              </Alert>
            )}

            {state === 'error' && (
              <>
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="flex flex-col gap-3 pt-2">
                  {user && token && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setState('idle')
                      }}
                    >
                      Try Again
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AcceptInvitePage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
