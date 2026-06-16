import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_LIST } from '@/lib/plans'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          Church Finance
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signup">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing for every church</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free, upgrade when your team and transaction volume grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_LIST.map((plan) => (
            <Card key={plan.id} className={plan.id === 'starter' ? 'border-primary shadow-md' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {plan.priceMonthlyCents === 0
                    ? 'Free forever'
                    : `$${(plan.priceMonthlyCents / 100).toFixed(0)}/month`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li>Up to {plan.maxUsers} users</li>
                  <li>{plan.maxTransactionsPerYear.toLocaleString()} transactions/year</li>
                  <li>{plan.maxMembers.toLocaleString()} members</li>
                </ul>
                <Button className="w-full" variant={plan.id === 'starter' ? 'default' : 'outline'} asChild>
                  <Link href="/auth/signup">{plan.id === 'free' ? 'Get started' : 'Start trial'}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
