'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowRight,
  BarChart3,
  Users,
  DollarSign,
  Shield,
  TrendingUp,
  FileText,
  CheckCircle,
  Star,
  Zap,
  PiggyBank,
  CreditCard
} from 'lucide-react'

export default function HomePage(): JSX.Element {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const features = [
    {
      title: 'Dashboard',
      description: 'Real-time overview of church finances with interactive charts and key performance indicators',
      icon: BarChart3,
      href: '/dashboard',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Income & Expenses',
      description: 'Comprehensive transaction tracking with automated categorization and reporting',
      icon: DollarSign,
      href: '/transactions',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Offerings & Tithes',
      description: 'Streamlined offering management with member tracking and contribution analytics',
      icon: Users,
      href: '/offerings',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Fund Management',
      description: 'Organize multiple funds with detailed allocation tracking and budget monitoring',
      icon: PiggyBank,
      href: '/funds',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      title: 'Bills & Petty Cash',
      description: 'Efficient expense management with receipt tracking and approval workflows',
      icon: CreditCard,
      href: '/bills',
      gradient: 'from-red-500 to-pink-500'
    },
    {
      title: 'Advances',
      description: 'Track advance payments and reimbursements with automated reconciliation',
      icon: TrendingUp,
      href: '/advances',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      title: 'Reports',
      description: 'Generate comprehensive financial reports with customizable templates and exports',
      icon: FileText,
      href: '/reports',
      gradient: 'from-gray-500 to-slate-500'
    }
  ]

  const benefits = [
    { icon: Shield, text: 'Bank-level security with encrypted data' },
    { icon: Zap, text: 'Fast performance and real-time updates' },
    { icon: CheckCircle, text: 'Automated compliance and audit trails' },
    { icon: Star, text: 'Intuitive, role-based user experience' }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <div className="container mx-auto px-4 pt-20 pb-16">
          <div className="text-center">
            {/* Main Heading */}
            <div className="mb-8">
              <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
                Church Finance
                <br />
                <span className="text-primary">
                  Management
                </span>
              </h1>
              <div className="w-24 h-1 bg-primary mx-auto mb-8 rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-12 leading-relaxed">
              Transform your church&apos;s financial operations with a modern
              management platform. Streamline donations, track expenses, and generate insights
              <span className="font-semibold text-primary"> effortlessly</span>.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground text-center leading-tight">
                      {benefit.text}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/auth/login">
                <Button size="lg" className="group px-8 py-4 font-semibold">
                  <span className="flex items-center gap-2">
                    Get Started Now
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-8 py-4 font-semibold">
                  View Pricing
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 font-semibold"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to manage your church finances with confidence and precision
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={index}
                  href={feature.href}
                  className="group block"
                >
                  <div className="relative h-full p-8 bg-card border border-border rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/40 overflow-hidden">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-all duration-500 bg-gradient-to-br ${feature.gradient}`} />

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center mb-6">
                        <div className="p-4 bg-primary/10 rounded-2xl mr-4 group-hover:scale-110 transition-transform duration-300 border border-border">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Hover Arrow */}
                      <div className="flex items-center mt-6 text-primary">
                        <span className="text-sm font-semibold mr-2">Learn More</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Ready to Transform Your
                <br />
                <span className="text-primary">
                  Church Finances?
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Use the platform to streamline your financial operations and focus on what matters most.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="group px-8 py-4 font-semibold">
                    <span className="flex items-center gap-2">
                      Start Free Trial
                      <Star className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-income" />
                  <span className="text-sm font-medium">No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
