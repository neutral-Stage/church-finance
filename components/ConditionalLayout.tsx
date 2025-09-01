'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Routes that should show Header and Footer
  const allowedRoutes = [
    '/',
    '/auth/login',
    '/auth/signup'
  ]
  
  // Check if current path should show header and footer
  const shouldShowHeaderFooter = pathname ? allowedRoutes.includes(pathname) : false
  
  return (
    <>
      {shouldShowHeaderFooter && <Header />}
      <main className="flex-1 relative z-10">
        {children}
      </main>
      {shouldShowHeaderFooter && <Footer />}
    </>
  )
}