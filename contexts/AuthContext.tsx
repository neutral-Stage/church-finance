'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, UserRole } from '@/types/database'

export type { UserRole } from '@/types/database'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  setServerUser: (user: AuthUser) => void
  hasRole: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializedFromServer, setInitializedFromServer] = useState(false)
  const router = useRouter()

  // Get user data from the server (for UI state only)
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          console.log('AuthContext: User data loaded successfully:', data.user.email, 'with role:', data.user.role)
          setUser(data.user)
        } else {
          console.log('AuthContext: No user data returned')
          setUser(null)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('AuthContext: API error:', response.status, errorData.error || 'Unknown error')
        
        // If it's a server error (500) or data integrity error, we should handle it differently
        if (response.status >= 500) {
          console.error('AuthContext: Server error detected. This may be a critical authentication issue.')
        }
        
        setUser(null)
      }
    } catch (error) {
      console.error('AuthContext: Network or parsing error refreshing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, []) // Empty dependency array is correct here - this function should be stable

  // Sign in - handles authentication and navigation
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        setLoading(false) // Set loading to false immediately on success
        return { error: null }
      } else {
        setLoading(false)
        return { error: data.error || 'Authentication failed' }
      }
    } catch (error) {
      console.error('AuthContext: Sign in error:', error)
      setLoading(false)
      return { error: 'Network error during sign in' }
    }
  }

  // Sign out - handles logout and navigation
  const signOut = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      })
      
      // Always clear user state first for immediate UI response
      setUser(null)
      
      if (response.ok) {
        // Force a hard redirect to ensure clean state
        window.location.href = '/auth/login'
      }
    } catch (error) {
      console.error('AuthContext: Sign out error:', error)
      setUser(null)
      // Still navigate to login on error - use hard redirect
      window.location.href = '/auth/login'
    } finally {
      setLoading(false)
    }
  }

  // Set user data from server (to prevent race conditions)
  const setServerUser = useCallback((serverUser: AuthUser) => {
    setUser(serverUser)
    setLoading(false)
    setInitializedFromServer(true)
  }, []) // Empty dependency array is correct here - this function should be stable

  // Check if user has specific role (for UI state only)
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false
    
    const userRole = user.role?.toLowerCase()
    
    // Exact role match only - each role should only see their own items
    return userRole === role.toLowerCase()
  }

  // Initialize user state on mount (for UI only, not auth checking)
  // Skip if already initialized from server to prevent race conditions
  useEffect(() => {
    if (!initializedFromServer) {
      refreshUser()
    }
  }, [initializedFromServer, refreshUser]) // Include refreshUser in dependencies

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
    setServerUser,
    hasRole,
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

// Higher-order component for loading state only (auth handled by middleware)
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  const AuthenticatedComponent = (props: P) => {
    const { loading } = useAuth()

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white/70">Loading...</span>
        </div>
      )
    }

    return <Component {...props} />
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return AuthenticatedComponent
}