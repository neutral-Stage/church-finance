'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Church, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, user } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(typeof error === 'string' ? error : 'An error occurred during sign in')
        setLoading(false)
      } else {
        console.log('Login successful, redirecting to dashboard...')
        router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-primary/10 p-4 rounded-full border border-border">
                <Church className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mb-2">
              Church Finance
            </CardTitle>
            <CardDescription className="text-base">
              Welcome back! Please sign in to your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 font-semibold text-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing you in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-primary font-semibold hover:underline transition-colors duration-200"
                >
                  Create Account
                </Link>
              </p>
            </div>

            <div className="mt-8 p-6 bg-muted/50 rounded-xl border border-border">
              <p className="text-sm font-semibold mb-4 text-center text-muted-foreground">Demo Accounts</p>
              <div className="space-y-3">
                {[
                  { role: 'Administrator', desc: 'Full access to all features', email: 'admin@church.com', pass: 'admin123' },
                  { role: 'Treasurer', desc: 'Financial management', email: 'treasurer@church.com', pass: 'treasurer123' },
                  { role: 'Viewer', desc: 'Read-only access', email: 'viewer@church.com', pass: 'viewer123' },
                ].map((account) => (
                  <div key={account.role} className="flex justify-between items-center p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors duration-200">
                    <div>
                      <p className="text-sm font-medium text-foreground">{account.role}</p>
                      <p className="text-xs text-muted-foreground">{account.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground">{account.email}</p>
                      <p className="text-xs text-muted-foreground">{account.pass}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
