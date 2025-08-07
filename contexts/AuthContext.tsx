'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { UserRole, AuthUser } from '@/types/database'
import { Button } from '@/components/ui/button'

// Re-export UserRole for use in other components
export type { UserRole }

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  canEdit: () => boolean
  canDelete: () => boolean
  canApprove: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session) {
        setSession(session)
        setUser(mapUserFromSession(session.user))
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          setUser(mapUserFromSession(session.user))
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const mapUserFromSession = (user: User): AuthUser => {
    return {
      id: user.id,
      email: user.email || '',
      role: (user.user_metadata?.role as UserRole) || 'Viewer',
      full_name: user.user_metadata?.full_name,
      created_at: user.created_at
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'Viewer', // Default role
          ...metadata
        }
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false

    const roleHierarchy: Record<UserRole, number> = {
      'Viewer': 1,
      'Treasurer': 2,
      'Admin': 3
    }

    return roleHierarchy[user.role] >= roleHierarchy[role]
  }

  const canEdit = (): boolean => {
    return hasRole('Treasurer')
  }

  const canDelete = (): boolean => {
    return hasRole('Admin')
  }

  const canApprove = (): boolean => {
    return hasRole('Treasurer')
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    canEdit,
    canDelete,
    canApprove
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, hasRole } = useAuth()

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Authentication Required
              </h1>
              <p className="text-gray-600 mb-6">
                Please sign in to access the Church Finance Management dashboard.
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
              <div className="mt-4">
                <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Access Denied
              </h1>
              <p className="text-gray-600 mb-4">
                You don&lsquo;t have permission to access this page.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Required role: {requiredRole} | Your role: {user?.role}
              </p>
              <Link href="/dashboard">
                <Button>
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}