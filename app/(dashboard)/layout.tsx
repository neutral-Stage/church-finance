'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, withAuth, type UserRole } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
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
import SearchModal from '@/components/SearchModal'
import NotificationsDropdown from '@/components/NotificationsDropdown'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, signOut, hasRole } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  // Touch gesture handling for mobile sidebar
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

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


  
  // Enhanced touch handling for mobile sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    // Enhanced swipe detection with better sensitivity
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      // Swipe left to close sidebar (reduced threshold for better responsiveness)
      if (deltaX < -30) {
        setSidebarOpen(false)
        setTouchStart(null)
      }
    }
  }

  const handleTouchEnd = () => {
    setTouchStart(null)
  }

  // Auto-close sidebar on navigation for mobile
  const handleNavigation = (href: string) => {
    router.push(href)
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setTimeout(() => setSidebarOpen(false), 100)
    }
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full relative",
      mobile ? "w-full" : "w-64 glass-card-dark border-r border-white/10"
    )}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className={cn(
        "relative flex items-center border-b border-white/10",
        mobile ? "h-20 px-6" : "h-16 mobile-container"
      )}>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg" />
          <div className="relative bg-blue-400/10 p-2 rounded-full backdrop-blur-sm border border-blue-400/20">
            <Church className={cn("text-blue-400", mobile ? "h-6 w-6" : "h-5 w-5 sm:h-6 sm:w-6")} />
          </div>
        </div>
        <span className={cn(
          "ml-3 font-bold text-white truncate",
          mobile ? "text-xl" : "text-lg sm:text-xl"
        )}>Church Finance</span>
      </div>
      
      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-6 relative overflow-y-auto",
        mobile ? "px-6 space-y-3" : "mobile-container mobile-space-y"
      )}>
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "group flex items-center w-full text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden touch-manipulation transform-gpu",
                mobile ? "px-4 py-4 min-h-[56px] active:scale-95 hover:scale-[1.02]" : "mobile-button",
                isActive
                  ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20 scale-[1.02]"
                  : "text-white/80 hover:bg-white/10 hover:text-white hover:scale-105 hover:shadow-md active:scale-95"
              )}
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
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
            </button>
          )
        })}
      </nav>
      
      {/* User Profile Section */}
      <div className={cn(
        "relative border-t border-white/10",
        mobile ? "p-6" : "p-4"
      )}>
        <div className={cn(
          "glass-card-light rounded-xl",
          mobile ? "p-5" : "p-4"
        )}>
          <div className={cn(
            "flex items-center",
            mobile ? "space-x-4" : "space-x-3"
          )}>
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
              <Avatar className={cn(
                "relative border-2 border-white/20 hover:border-white/40 transition-all duration-300 group",
                mobile ? "h-12 w-12" : "h-10 w-10"
              )}>
                <AvatarFallback className="bg-white/10 group-hover:bg-white/20 text-white font-semibold transition-all duration-300">
                  <span className="transition-all duration-300 group-hover:scale-110 group-hover:text-white/90">
                    {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                  </span>
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-white truncate",
                mobile ? "text-base" : "text-sm"
              )}>
                {user?.full_name || user?.email}
              </p>
              <p className={cn(
                "text-white/70 capitalize",
                mobile ? "text-sm" : "text-xs"
              )}>{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}} />
        
        {/* Secondary floating elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-xl animate-bounce" style={{animationDelay: '1s'}} />
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/3 rounded-full blur-xl animate-bounce" style={{animationDelay: '3s'}} />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-gradient-to-r from-cyan-600/8 to-blue-600/8 rounded-full blur-2xl animate-pulse" style={{animationDelay: '5s'}} />
      </div>
      
      {/* Main Dashboard Container */}
      <div className="flex h-screen relative z-10">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex relative z-10">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-80 sm:w-64 glass-card-dark backdrop-blur-xl bg-black/20 border-white/10"
          onInteractOutside={() => setSidebarOpen(false)}
          onEscapeKeyDown={() => setSidebarOpen(false)}
          onPointerDownOutside={() => setSidebarOpen(false)}
        >
          {/* Required for accessibility */}
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          
          {/* Swipe indicator */}
          <div className="absolute top-4 right-4 z-50 opacity-40 pointer-events-none">
            <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="w-1 h-4 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
              <div className="w-1 h-4 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '200ms'}} />
              <div className="w-1 h-4 bg-white/20 rounded-full animate-pulse" style={{animationDelay: '400ms'}} />
            </div>
          </div>
          
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="h-full touch-manipulation"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            <Sidebar mobile />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Modern Header */}
        <header className="glass-card-light border-b border-white/10 mobile-container py-3 sm:py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center mobile-space-x">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="mobile-nav-visible text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 p-3 min-h-[48px] min-w-[48px] rounded-xl transform-gpu glass-card-light border border-white/10 shadow-lg"
                onClick={() => setSidebarOpen(true)}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <Menu className="h-6 w-6 transition-all duration-300 group-hover:rotate-180 drop-shadow-sm" />
              </Button>
              
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
                onClick={() => setSearchOpen(true)}
                className="mobile-nav-hidden text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 p-3 min-h-[44px] min-w-[44px] rounded-xl"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              {/* Mobile search button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="mobile-nav-visible text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 p-3 min-h-[44px] min-w-[44px] rounded-xl"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              {/* Notifications */}
              <NotificationsDropdown className="mobile-nav-hidden" />
              
              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative min-h-[44px] min-w-[44px] rounded-full hover:scale-105 active:scale-95 transition-all duration-300 group hover:bg-transparent focus:bg-transparent p-1">
                    <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Avatar className="h-10 w-10 border-2 border-white/20 group-hover:border-white/40 transition-all duration-300">
                      <AvatarFallback className="bg-white/10 group-hover:bg-white/20 text-white font-semibold text-sm transition-all duration-300">
                        <span className="transition-all duration-300 group-hover:scale-110 group-hover:text-white/90">
                          {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 glass-card-dark backdrop-blur-2xl border-white/10 text-white" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-white/20">
                          <AvatarFallback className="bg-white/10 text-white font-semibold">
                            <span className="transition-all duration-300">
                              {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                            </span>
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
                  <DropdownMenuItem 
                    onClick={() => router.push('/profile-settings')}
                    className="hover:bg-white/10 focus:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
                  >
                    <User className="mr-3 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => router.push('/preferences')}
                    className="hover:bg-white/10 focus:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
                  >
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
      
        {/* Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </div>
  )
}

export default withAuth(DashboardLayout)