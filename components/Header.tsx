'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
              <span className="text-primary-foreground font-bold text-lg">CF</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">
                Church Finance
              </span>
              <span className="text-xs text-muted-foreground font-medium -mt-1">Management System</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost">
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 border border-border rounded-lg">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
