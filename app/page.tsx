import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText,
  PiggyBank,
  CreditCard,
  BarChart3
} from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      title: 'Dashboard',
      description: 'Overview of church finances and key metrics',
      icon: BarChart3,
      href: '/dashboard',
      color: 'text-blue-600'
    },
    {
      title: 'Income & Expenses',
      description: 'Track all financial transactions',
      icon: DollarSign,
      href: '/income-expenses',
      color: 'text-green-600'
    },
    {
      title: 'Offerings & Tithes',
      description: 'Manage church offerings and tithes',
      icon: Users,
      href: '/offerings',
      color: 'text-purple-600'
    },
    {
      title: 'Fund Management',
      description: 'Organize and track different funds',
      icon: PiggyBank,
      href: '/funds',
      color: 'text-orange-600'
    },
    {
      title: 'Bills & Petty Cash',
      description: 'Manage bills and petty cash expenses',
      icon: CreditCard,
      href: '/bills',
      color: 'text-red-600'
    },
    {
      title: 'Advances',
      description: 'Track advance payments and reimbursements',
      icon: TrendingUp,
      href: '/advances',
      color: 'text-indigo-600'
    },
    {
      title: 'Reports',
      description: 'Generate financial reports and exports',
      icon: FileText,
      href: '/reports',
      color: 'text-gray-600'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Church Finance Management
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Comprehensive financial management system for your church community
        </p>
        
        {/* Authentication Call-to-Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Get Started Today
          </h2>
          <p className="text-blue-700 mb-4">
            Sign in to access your church&apos;s financial dashboard and manage all your financial operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/login">
              <Button className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full sm:w-auto">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={feature.href}>
                  <Button className="w-full">Access {feature.title}</Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Manage Your Finances?
          </h3>
          <p className="text-gray-600 mb-4">
            Access your dashboard to start managing your church&apos;s financial operations.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}