'use client'

import { useState, useEffect, useCallback } from 'react'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth, withAuth, type UserRole } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
  ChevronLeft,
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
    roles: ['viewer', 'treasurer', 'admin']
  },
  {
    name: 'Income & Expenses',
    href: '/transactions',
    icon: ArrowUpDown,
    roles: ['viewer', 'treasurer', 'admin']
  },
  {
    name: 'Offerings & Tithes',
    href: '/offerings',
    icon: Gift,
    roles: ['viewer', 'treasurer', 'admin']
  },
  {
    name: 'Members',
    href: '/members',
    icon: Users,
    roles: ['treasurer', 'admin']
  },
  {
    name: 'Member Contributions',
    href: '/member-contributions',
    icon: TrendingUp,
    roles: ['viewer', 'treasurer', 'admin']
  },
  {
    name: 'Fund Management',
    href: '/funds',
    icon: Wallet,
    roles: ['treasurer', 'admin']
  },
  {
    name: 'Cash Breakdown',
    href: '/cash-breakdown',
    icon: Banknote,
    roles: ['treasurer', 'admin']
  },
  {
    name: 'Bills & Petty Cash',
    href: '/bills',
    icon: Receipt,
    roles: ['viewer', 'treasurer', 'admin']
  },
  {
    name: 'Advances',
    href: '/advances',
    icon: CreditCard,
    roles: ['treasurer', 'admin']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['viewer', 'treasurer', 'admin']
  }
]

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { user, signOut, hasRole } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  // Touch gesture handling for mobile sidebar
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  // Add shimmer animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    setMounted(true)
  }, [])

  // Premium toggle sidebar function with smooth transitions
  const toggleSidebar = useCallback(() => {
    setIsTransitioning(true)
    setIsCollapsed(prev => !prev)
    // Reset hover state when toggling
    if (isHovered) {
      setIsHovered(false)
    }
    // Reset transition state after animation completes
    setTimeout(() => setIsTransitioning(false), 600)
  }, [isHovered])

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

  // Helper variables for sidebar state
  const sidebarExpanded = !isCollapsed || isHovered
  const sidebarHovered = isHovered

  // Auto-close sidebar on navigation for mobile
  const handleNavigation = (href: string) => {
    router.push(href)
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setTimeout(() => setSidebarOpen(false), 100)
    }
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div 
      className={cn(
        "flex flex-col h-full relative group transform-gpu",
        mobile ? "w-full transition-all duration-300 ease-out" : cn(
          "glass-card-frosted border-r border-white/[0.08] custom-scrollbar sidebar-animate",
          (!isCollapsed || isHovered) ? cn(
            "sidebar-expanded",
            isHovered && isCollapsed ? "sidebar-hover-expanded" : ""
          ) : "sidebar-collapsed"
        ),
        // Add premium visual states
        !mobile && isHovered && isCollapsed && "shadow-2xl shadow-black/20",
        !mobile && isTransitioning && "transition-shadow duration-600"
      )}
      onMouseEnter={() => {
        if (!mobile && isCollapsed && !isTransitioning) {
          setIsHovered(true)
        }
      }}
      onMouseLeave={() => {
        if (!mobile && isCollapsed && !isTransitioning) {
          setIsHovered(false)
        }
      }}
      style={{
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width, transform, box-shadow, background',
        background: mobile ? undefined : isHovered && isCollapsed ? 
          'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.15) 100%)' :
          'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 100%)'
      }}
    >
      {/* Premium gradient overlay with dynamic opacity */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent pointer-events-none transition-opacity duration-400",
        isHovered && !mobile && "from-white/[0.12] via-white/[0.04]"
      )} />
      
      {/* Sophisticated edge highlight */}
      <div className={cn(
        "absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent transition-opacity duration-400",
        !mobile && isHovered && "opacity-100",
        !mobile && !isHovered && "opacity-60"
      )} />
      
      {/* Premium Header */}
      <div className={cn(
        "relative flex items-center border-b border-white/[0.08] transition-all duration-400",
        mobile ? "h-20 px-6" : "h-18 px-5", // Slightly taller for premium feel
        mobile ? "justify-start" : (!isCollapsed || isHovered) ? "justify-between" : "justify-center",
        // Add subtle inner glow
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent"
      )}>
        {/* Premium Logo with sophisticated glow */}
        <div className="relative flex items-center group/logo">
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl transition-all duration-600",
            "bg-gradient-to-r from-blue-400/30 via-purple-400/20 to-blue-400/30",
            "group-hover/logo:from-blue-400/40 group-hover/logo:via-purple-400/30 group-hover/logo:to-blue-400/40 group-hover/logo:scale-110"
          )} />
          <div className={cn(
            "relative backdrop-blur-xl border transition-all duration-600 group-hover/logo:scale-105",
            "bg-gradient-to-br from-blue-400/15 via-purple-400/10 to-blue-400/15",
            "border-white/10 group-hover/logo:border-white/20",
            "rounded-xl shadow-lg group-hover/logo:shadow-xl",
            mobile ? "p-3" : "p-2.5"
          )}>
            <Church className={cn(
              "transition-all duration-300 drop-shadow-lg",
              "text-blue-300 group-hover/logo:text-blue-200 group-hover/logo:scale-110",
              mobile ? "h-6 w-6" : "h-5 w-5"
            )} />
          </div>
        </div>
        {(mobile || !isCollapsed || isHovered) && (
          <div className={cn(
            "ml-4 transition-all duration-500",
            !mobile && !sidebarExpanded && "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
          )}>
            <span className={cn(
              "font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent",
              "drop-shadow-sm transition-all duration-300",
              mobile ? "text-xl" : "text-lg"
            )}>Church Finance</span>
            <div className={cn(
              "h-0.5 bg-gradient-to-r from-blue-400/60 to-purple-400/60 rounded-full transition-all duration-500",
              "mt-1 transform origin-left",
              !mobile && isCollapsed && !isHovered ? "scale-x-0" : "scale-x-100"
            )} />
          </div>
        )}
        
        {/* Premium Interactive Toggle Button - Desktop Only */}
        {!mobile && (
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleSidebar()
            }}
            onMouseDown={(e) => e.preventDefault()}
            variant="ghost"
            size="sm"
            className={cn(
              "group/toggle p-2.5 h-9 w-9 rounded-xl text-white/70 hover:text-white transform-gpu",
              "sidebar-toggle-button relative overflow-hidden",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              (!isCollapsed || isHovered) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              isTransitioning && "pointer-events-none"
            )}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            tabIndex={0}
            type="button"
            disabled={isTransitioning}
          >
            {/* Button background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/toggle:opacity-100 transition-opacity duration-300 rounded-xl" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-active/toggle:opacity-100 transition-opacity duration-150 rounded-xl" />
            
            <ChevronLeft 
              className={cn(
                "sidebar-toggle-icon h-3 w-3 relative z-10 drop-shadow-sm",
                "transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1)",
                isCollapsed ? "rotate-180" : "rotate-0",
                isTransitioning && "animate-pulse"
              )}
            />
          </Button>
        )}
      </div>
      
      {/* Premium Navigation */}
      <nav 
        className={cn(
          "flex-1 py-5 relative custom-scrollbar",
          mobile ? "px-6 space-y-2.5 overflow-y-auto overflow-x-hidden" : "px-3 space-y-1.5 overflow-y-auto overflow-x-hidden",
          // Add subtle inner shadow
          "before:absolute before:top-0 before:left-0 before:right-0 before:h-4 before:bg-gradient-to-b before:from-black/10 before:to-transparent before:pointer-events-none"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {filteredNavigation.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <div key={item.name} className="nav-item relative group/nav" style={{ transitionDelay: `${index * 0.03}s` }}>
              <button
                onClick={() => handleNavigation(item.href)}
                aria-label={`Navigate to ${item.name}`}
                aria-current={isActive ? 'page' : undefined}
                title={!mobile && isCollapsed && !isHovered ? item.name : undefined}
                className={cn(
                  "group/button flex items-center w-full text-sm font-medium rounded-2xl relative touch-manipulation transform-gpu",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  "sidebar-item-animate backdrop-blur-sm",
                  mobile ? "px-5 py-3.5 min-h-[52px] justify-start overflow-visible" : cn(
                    "py-3 min-h-[48px] transition-all duration-500",
                    (!isCollapsed || isHovered) ? "sidebar-item-expanded pl-4 pr-4 justify-start overflow-hidden" : "sidebar-item-collapsed pl-0 pr-0 justify-center overflow-hidden"
                  ),
                  isActive
                    ? cn(
                        "bg-gradient-to-r from-blue-500/25 via-purple-500/20 to-blue-500/25",
                        "text-white shadow-xl border border-white/20 scale-[1.02]",
                        "shadow-blue-500/10"
                      )
                    : cn(
                        "text-white/85 hover:text-white",
                        "hover:bg-gradient-to-r hover:from-white/12 hover:via-white/8 hover:to-white/12",
                        "hover:shadow-lg hover:scale-[1.015] hover:border-white/10",
                        "active:scale-[0.995] border border-transparent",
                        "hover:shadow-black/5"
                      )
                )}
                style={{
                  transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
                  willChange: 'transform, background, box-shadow, border-color'
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 rounded-r-full" />
                )}
                
                {/* Clean Icon */}
                <div className={cn(
                  "relative flex-shrink-0 transform-gpu flex items-center justify-center sidebar-icon-animate sidebar-icon-container",
                  "w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-lg",
                  mobile ? "mr-4" : "",
                  isActive ? "text-blue-200" : "text-white/90 group-hover/button:text-blue-100"
                )}>
                  <item.icon className={cn(
                    "relative h-4 w-4 transition-all duration-300 transform-gpu z-10 flex-shrink-0",
                    "filter drop-shadow-sm",
                    isActive ? "scale-110 drop-shadow-lg" : "group-hover/button:scale-105 group-hover/button:drop-shadow-md"
                  )} />
                </div>
                
                {/* Premium text label with gradient and smooth transition */}
                {(mobile || !isCollapsed || isHovered) && (
                  <span className={cn(
                    "relative z-10 whitespace-nowrap font-medium transform-gpu sidebar-text-animate",
                    "tracking-wide ml-3 flex-1 min-w-0", // Slightly wider letter spacing for premium feel
                    mobile ? "opacity-100 translate-x-0" : cn(
                      (!isCollapsed || isHovered) 
                        ? "sidebar-text-visible" 
                        : "sidebar-text-hidden"
                    ),
                    isActive ? "text-white font-semibold bg-gradient-to-r from-white to-white/95 bg-clip-text" : "text-white/90 group-hover/button:text-white"
                  )}>
                    {item.name}
                  </span>
                )}
                
              </button>
              
              {/* Premium tooltip for collapsed state with enhanced styling */}
              {!mobile && isCollapsed && !isHovered && (
                <div 
                  className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/nav:opacity-100 group-focus/nav:opacity-100 transition-all duration-400 pointer-events-none transform-gpu"
                  role="tooltip"
                  aria-hidden="true"
                  style={{
                    transform: 'translateX(-12px) translateY(-50%) scale(0.92)',
                    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
                  }}
                >
                  <div className={cn(
                    "glass-card-frosted backdrop-blur-2xl text-white text-sm px-5 py-3 rounded-xl shadow-2xl border border-white/15",
                    "whitespace-nowrap group-hover/nav:scale-100 group-hover/nav:translate-x-0",
                    "bg-gradient-to-br from-black/40 to-black/20"
                  )}>
                    <span className="font-medium tracking-wide">{item.name}</span>
                    
                    {/* Premium tooltip arrow */}
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-4 h-4 rotate-45",
                      "bg-gradient-to-br from-black/40 to-black/20 border-l border-b border-white/15",
                      "backdrop-blur-2xl"
                    )} />
                    
                    {/* Subtle inner highlight */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>
      
      {/* Premium User Profile Section */}
      <div className={cn(
        "relative border-t border-white/[0.08] transition-all duration-500",
        "bg-gradient-to-t from-black/10 to-transparent", // Subtle background gradient
        mobile ? "p-6" : "p-4",
        // Add top highlight
        "before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
      )}>
        <div className={cn(
          "glass-card-frosted rounded-2xl transition-all duration-600 transform-gpu group/profile",
          "hover:scale-[1.02] hover:shadow-xl relative overflow-hidden",
          mobile ? "p-5" : cn(
            (sidebarExpanded || sidebarHovered) ? "p-4" : "p-3"
          ),
          "bg-gradient-to-br from-white/8 to-white/4 border-white/10"
        )} style={{
          transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          willChange: 'transform, box-shadow',
          backdropFilter: 'blur(20px) saturate(180%)'
        }}>
          {/* Premium background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-purple-400/5 opacity-0 group-hover/profile:opacity-100 transition-opacity duration-500 rounded-2xl" />
          <div className={cn(
            "flex items-center transition-all duration-300",
            mobile ? "space-x-4" : cn(
              (sidebarExpanded || sidebarHovered) ? "space-x-3" : "justify-center"
            )
          )}>
            {/* Premium Avatar with sophisticated effects */}
            <div className="relative flex-shrink-0 group/avatar">
              {/* Multi-layer glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/15 rounded-full blur-lg group-hover/avatar:from-blue-400/30 group-hover/avatar:to-purple-400/25 group-hover/avatar:scale-125 transition-all duration-500" />
              <div className="absolute inset-0 bg-white/10 rounded-full blur-md group-hover/avatar:bg-white/20 group-hover/avatar:scale-110 transition-all duration-400" />
              
              <Avatar className={cn(
                "relative border-2 transition-all duration-500 group transform-gpu hover:scale-110 z-10",
                "border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl",
                "bg-gradient-to-br from-white/10 to-white/5",
                mobile ? "h-12 w-12" : "h-10 w-10" // Slightly larger for premium feel
              )} style={{
                transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                willChange: 'transform, border-color, box-shadow'
              }}>
                <AvatarFallback className={cn(
                  "bg-gradient-to-br from-white/15 to-white/8 text-white font-bold transition-all duration-400",
                  "group-hover:from-white/25 group-hover:to-white/15 backdrop-blur-sm"
                )}>
                  <span className={cn(
                    "transition-all duration-400 group-hover:scale-110 drop-shadow-sm",
                    mobile ? "text-sm" : "text-xs"
                  )}>
                    {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                  </span>
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Premium User Info with smooth transitions */}
            {(mobile || sidebarExpanded || sidebarHovered) && (
              <div className={cn(
                "flex-1 min-w-0 transition-all duration-500 relative z-10",
                !mobile && !sidebarExpanded && "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              )}>
                <p className={cn(
                  "font-bold text-white truncate transition-all duration-300",
                  "bg-gradient-to-r from-white to-white/95 bg-clip-text",
                  mobile ? "text-base" : "text-sm"
                )}>
                  {user?.full_name || user?.email}
                </p>
                <div className={cn(
                  "flex items-center mt-1 transition-all duration-300",
                  mobile ? "space-x-2" : "space-x-1.5"
                )}>
                  <div className={cn(
                    "px-2 py-0.5 rounded-md bg-gradient-to-r transition-all duration-300",
                    user?.role === 'admin' ? "from-red-500/20 to-pink-500/20 border border-red-400/20" :
                    user?.role === 'treasurer' ? "from-blue-500/20 to-indigo-500/20 border border-blue-400/20" :
                    "from-green-500/20 to-emerald-500/20 border border-green-400/20"
                  )}>
                    <p className={cn(
                      "capitalize font-medium tracking-wide",
                      user?.role === 'admin' ? "text-red-200" :
                      user?.role === 'treasurer' ? "text-blue-200" :
                      "text-green-200",
                      mobile ? "text-xs" : "text-[0.65rem]"
                    )}>{user?.role}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative dashboard-container">
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
      <div className="hidden lg:flex relative z-20">
        <Sidebar />
      </div>

      {/* Premium Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-80 sm:w-72 glass-card-frosted backdrop-blur-2xl border-white/10 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%)',
            backdropFilter: 'blur(40px) saturate(200%) brightness(110%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(110%)'
          }}
          onInteractOutside={() => setSidebarOpen(false)}
          onEscapeKeyDown={() => setSidebarOpen(false)}
          onPointerDownOutside={() => setSidebarOpen(false)}
        >
          {/* Required for accessibility */}
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          
          {/* Premium swipe indicator */}
          <div className="absolute top-5 right-5 z-50 opacity-50 pointer-events-none">
            <div className="flex space-x-1.5 bg-gradient-to-r from-white/15 to-white/8 backdrop-blur-xl rounded-full px-3 py-2 border border-white/10">
              <div className="w-1 h-5 bg-gradient-to-t from-blue-400/80 to-blue-300/60 rounded-full animate-pulse shadow-sm" style={{animationDelay: '0ms'}} />
              <div className="w-1 h-5 bg-gradient-to-t from-blue-400/60 to-blue-300/40 rounded-full animate-pulse shadow-sm" style={{animationDelay: '200ms'}} />
              <div className="w-1 h-5 bg-gradient-to-t from-blue-400/40 to-blue-300/20 rounded-full animate-pulse shadow-sm" style={{animationDelay: '400ms'}} />
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
      <div 
        className={cn(
          "flex-1 flex flex-col relative z-10 main-content-container"
        )}
      >
        {/* Modern Header */}
        <header className="glass-card-light border-b border-white/10 mobile-container py-3 sm:py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center mobile-space-x">
              {/* Premium Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="mobile-nav-visible text-white group/menu-btn relative overflow-hidden transform-gpu min-h-[52px] min-w-[52px] rounded-2xl border border-white/10"
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)'
                }}
              >
                {/* Premium button effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent opacity-0 group-hover/menu-btn:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-purple-400/10 opacity-0 group-active/menu-btn:opacity-100 transition-opacity duration-150 rounded-2xl" />
                
                <Menu className="h-6 w-6 transition-all duration-400 group-hover/menu-btn:scale-110 group-hover/menu-btn:rotate-90 drop-shadow-sm relative z-10" />
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