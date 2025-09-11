'use client'

import { useState, useEffect } from 'react'
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
  Clock,
  TrendingUp,
  FileText,
  CheckCircle,
  Star,
  Zap,
  PiggyBank,
  CreditCard
} from 'lucide-react'

export default function HomePage(): JSX.Element {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while checking user for UI state only
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      title: 'Dashboard',
      description: 'Real-time overview of church finances with interactive charts and key performance indicators',
      icon: BarChart3,
      href: '/dashboard',
      gradient: 'from-blue-500 to-cyan-500',
      delay: '0ms'
    },
    {
      title: 'Income & Expenses',
      description: 'Comprehensive transaction tracking with automated categorization and reporting',
      icon: DollarSign,
      href: '/income-expenses',
      gradient: 'from-green-500 to-emerald-500',
      delay: '100ms'
    },
    {
      title: 'Offerings & Tithes',
      description: 'Streamlined offering management with member tracking and contribution analytics',
      icon: Users,
      href: '/offerings',
      gradient: 'from-purple-500 to-pink-500',
      delay: '200ms'
    },
    {
      title: 'Fund Management',
      description: 'Organize multiple funds with detailed allocation tracking and budget monitoring',
      icon: PiggyBank,
      href: '/funds',
      gradient: 'from-orange-500 to-red-500',
      delay: '300ms'
    },
    {
      title: 'Bills & Petty Cash',
      description: 'Efficient expense management with receipt tracking and approval workflows',
      icon: CreditCard,
      href: '/bills',
      gradient: 'from-red-500 to-pink-500',
      delay: '400ms'
    },
    {
      title: 'Advances',
      description: 'Track advance payments and reimbursements with automated reconciliation',
      icon: TrendingUp,
      href: '/advances',
      gradient: 'from-indigo-500 to-purple-500',
      delay: '500ms'
    },
    {
      title: 'Reports',
      description: 'Generate comprehensive financial reports with customizable templates and exports',
      icon: FileText,
      href: '/reports',
      gradient: 'from-gray-500 to-slate-500',
      delay: '600ms'
    }
  ]

  const benefits = [
    { icon: Shield, text: 'Bank-level security with encrypted data' },
    { icon: Zap, text: 'Lightning-fast performance and real-time updates' },
    { icon: CheckCircle, text: 'Automated compliance and audit trails' },
    { icon: Star, text: 'Award-winning user experience design' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            top: '10%',
            left: '10%'
          }}
        />
        <div
          className="absolute w-80 h-80 bg-gradient-to-r from-pink-500/30 to-orange-500/30 rounded-full blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * -0.01}px, ${mousePosition.y * -0.01}px)`,
            top: '60%',
            right: '10%',
            animationDelay: '1s'
          }}
        />
        <div
          className="absolute w-64 h-64 bg-gradient-to-r from-green-500/30 to-cyan-500/30 rounded-full blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)`,
            bottom: '20%',
            left: '50%',
            animationDelay: '2s'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 pt-20 pb-16">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Main Heading */}
            <div className="mb-8">
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-6 leading-tight">
                Church Finance
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Management
                </span>
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mb-8 rounded-full shadow-lg" />
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
              Transform your church&apos;s financial operations with our
              <span className="font-semibold text-blue-400"> award-winning </span>
              management platform. Streamline donations, track expenses, and generate insights
              <span className="font-semibold text-purple-400"> effortlessly</span>.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={index}
                    className={`flex flex-col items-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-xl hover:bg-white/15 transition-all duration-500 hover:scale-105 group ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    style={{ animationDelay: `${index * 100 + 500}ms` }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-200 text-center leading-tight group-hover:text-white transition-colors duration-300">
                      {benefit.text}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Link href="/auth/login">
                <Button size="lg" className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <span className="flex items-center gap-2">
                    Get Started Now
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 border-2 border-white/30 hover:border-white/50 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-gray-200 hover:text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
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
                  className={`group block transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ animationDelay: `${feature.delay}ms` }}
                >
                  <div className="relative h-full p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/15 overflow-hidden group-hover:border-white/40">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-all duration-700 bg-gradient-to-br ${feature.gradient}`} />

                    {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center mb-6">
                          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl mr-4 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                            <Icon className="h-8 w-8 text-blue-400 group-hover:text-white transition-colors duration-300" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-200 group-hover:text-white transition-colors duration-300">
                            {feature.title}
                          </h3>
                        </div>
                        <p className="text-gray-300 group-hover:text-white/90 leading-relaxed transition-colors duration-300">
                          {feature.description}
                        </p>

                        {/* Hover Arrow */}
                        <div className="flex items-center mt-6 text-blue-400 group-hover:text-white transition-colors duration-300">
                          <span className="text-sm font-semibold mr-2">Learn More</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                      </div>

                    {/* Decorative Elements */}
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>



      {/* Stats Section */}
      <div className="relative z-10 py-20 bg-gradient-to-r from-slate-800/50 to-purple-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Users, label: "Churches Served", value: "500+", color: "from-blue-500 to-blue-600" },
              { icon: DollarSign, label: "Funds Managed", value: "$2M+", color: "from-green-500 to-green-600" },
              { icon: Shield, label: "Security Rating", value: "A+", color: "from-purple-500 to-purple-600" },
              { icon: Clock, label: "Uptime", value: "99.9%", color: "from-orange-500 to-orange-600" }
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 group-hover:scale-110 transition-transform duration-300">
                    <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-300">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6">
                Ready to Transform Your
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Church Finances?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join hundreds of churches already using our platform to streamline their financial operations and focus on what matters most.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <span className="flex items-center gap-2">
                      Start Free Trial
                      <Star className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400" />
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