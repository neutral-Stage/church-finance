'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Dashboard routes that should not show Header and Footer
  const dashboardRoutes = [
    '/dashboard',
    '/advances',
    '/bills',
    '/funds',
    '/member-contributions',
    '/members',
    '/offerings',
    '/reports',
    '/transactions',
    '/cash-breakdown'
  ]
  
  // Check if current path is a dashboard route
  const isDashboardRoute = dashboardRoutes.some(route => pathname.startsWith(route))
  
  return (
    <>
      {!isDashboardRoute && <Header />}
      <main className="flex-1 relative z-10">
        {children}
      </main>
      {!isDashboardRoute && <Footer />}
    </>
  )
}