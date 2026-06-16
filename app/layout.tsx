import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/sonner'
import ConditionalLayout from '@/components/ConditionalLayout'
import { ThemeProvider } from '@/components/theme-provider'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { QueryProvider } from '@/components/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Church Finance Management',
  description: 'Comprehensive financial management system for churches',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Church Finance',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <ErrorBoundary>
              <AuthProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
                <Toaster />
                <ServiceWorkerRegister />
              </AuthProvider>
            </ErrorBoundary>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}