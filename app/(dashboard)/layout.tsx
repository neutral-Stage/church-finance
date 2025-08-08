'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, withAuth, type UserRole } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  ArrowUpDown,
  Gift,
  Wallet,
  Receipt,
  CreditCard,
  FileText,
  Church,
  Menu,
  LogOut,
  User,
  Users,
  TrendingUp,
  Banknote,
  Settings,
  Bell,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['Viewer', 'Treasurer', 'Admin']
  },
  {
    name: 'Income & Expenses',
    href: '/transactions',
    icon: ArrowUpDown,
    roles: ['Viewer', 'Treasurer', 'Admin']
  },
  {
    name: 'Offerings & Tithes',
    href: '/offerings',
    icon: Gift,
    roles: ['Viewer', 'Treasurer', 'Admin']
  },
  {
    name: 'Members',
    href: '/members',
    icon: Users,
    roles: ['Treasurer', 'Admin']
  },
  {
    name: 'Member Contributions',
    href: '/member-contributions',
    icon: TrendingUp,
    roles: ['Viewer', 'Treasurer', 'Admin']
  },
  {
    name: 'Fund Management',
    href: '/funds',
    icon: Wallet,
    roles: ['Treasurer', 'Admin']
  },
  {
    name: 'Cash Breakdown',
    href: '/cash-breakdown',
    icon: Banknote,
    roles: ['Treasurer', 'Admin']
  },
  {
    name: 'Bills & Petty Cash',
    href: '/bills',
    icon: Receipt,
    roles: ['Viewer', 'Treasurer', 'Admin']
  },
  {
    name: 'Advances',
    href: '/advances',
    icon: CreditCard,
    roles: ['Treasurer', 'Admin']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['Viewer', 'Treasurer', 'Admin']
  }
]

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, signOut, hasRole } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const filteredNavigation = navigation.filter(item => 
    item.roles.some(role => hasRole(role as UserRole))
  )

  if (!mounted) {
    return null
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full relative mobile-sidebar",
      mobile ? "glass-card-dark w-full" : "w-64 glass-card-dark border-r border-white/10",
      mobile && sidebarOpen ? "mobile-sidebar-open" : mobile ? "mobile-sidebar-closed" : ""
    )}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex items-center h-16 mobile-container border-b border-white/10">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg" />
          <div className="relative bg-blue-400/10 p-2 rounded-full backdrop-blur-sm border border-blue-400/20">
            <Church className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
        </div>
        <span className="ml-3 text-lg sm:text-xl font-bold text-white truncate">Church Finance</span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 mobile-container py-6 mobile-space-y relative">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                "group flex items-center mobile-button text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20"
                  : "text-white/80 hover:bg-white/10 hover:text-white hover:scale-105 hover:shadow-md"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
              )}
              
              {/* Icon with glow effect */}
              <div className={cn(
                "relative mr-3 transition-all duration-300",
                isActive ? "text-blue-300" : "text-white/70 group-hover:text-white"
              )}>
                {isActive && (
                  <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-md" />
                )}
                <item.icon className="relative h-5 w-5" />
              </div>
              
              <span className="relative z-10">{item.name}</span>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            </Link>
          )
        })}
      </nav>
      
      {/* User Profile Section */}
      <div className="relative p-4 border-t border-white/10">
        <div className="glass-card-light p-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
              <Avatar className="relative border-2 border-white/20">
                <AvatarFallback className="bg-white/10 text-white font-semibold">
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-white/70 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen gradient-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex relative z-10">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Modern Header */}
        <header className="glass-card-light border-b border-white/10 mobile-container py-3 sm:py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center mobile-space-x">
              {/* Mobile menu button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mobile-nav-visible text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 p-2"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              
              {/* Page title with gradient */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="hidden sm:block w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
              </div>
            </div>
            
            {/* Header actions */}
            <div className="flex items-center mobile-space-x">
              {/* Search button */}
              <Button
                variant="ghost"
                size="sm"
                className="mobile-nav-hidden text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 p-2"
              >
                <Search className="h-4 w-4" />
              </Button>
              
              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="relative text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 p-2"
              >
                <Bell className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              </Button>
              
              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:scale-105 transition-all duration-300 group">
                    <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Avatar className="h-8 w-8 border-2 border-white/20">
                      <AvatarFallback className="bg-white/10 text-white font-semibold text-xs">
                        {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 glass-card-dark border-white/10 text-white" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-white/20">
                          <AvatarFallback className="bg-white/10 text-white font-semibold">
                            {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-white/70">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="glass-card-light p-2 rounded-lg">
                        <p className="text-xs text-white/80 capitalize font-medium">
                          Role: {user?.role}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 text-white/90 hover:text-white transition-colors">
                    <User className="mr-3 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 text-white/90 hover:text-white transition-colors">
                    <Settings className="mr-3 h-4 w-4" />
                    <span>Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="hover:bg-red-500/20 focus:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content with glass effect */}
        <main className="flex-1 overflow-auto mobile-container relative">
          <div className="glass-card-light rounded-xl sm:rounded-2xl mobile-card min-h-full backdrop-blur-xl border border-white/10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default withAuth(DashboardLayout)