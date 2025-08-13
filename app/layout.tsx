import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import ConditionalLayout from "@/components/ConditionalLayout"
import { ErrorBoundary, NetworkStatus } from "@/components/error-boundary"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Church Finance Management",
  description: "Comprehensive church finance management system",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`}>
        <ErrorBoundary>
          <AuthProvider>
            <div className="min-h-screen flex flex-col relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{top: '10%', left: '10%'}} />
                <div className="absolute w-80 h-80 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{top: '60%', right: '10%', animationDelay: '1s'}} />
                <div className="absolute w-64 h-64 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{bottom: '20%', left: '50%', animationDelay: '2s'}} />
              </div>
              
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
              
              <NetworkStatus />
            </div>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}