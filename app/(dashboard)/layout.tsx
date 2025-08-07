'use client'

import { useState } from 'react'
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
  Banknote
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
  const { user, signOut, hasRole } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
  }

  const filteredNavigation = navigation.filter(item => 
    item.roles.some(role => hasRole(role as UserRole))
  )

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full",
      mobile ? "" : "w-64 bg-white border-r border-gray-200"
    )}>
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Church className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">Church Finance</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              
              <h1 className="ml-2 text-xl font-semibold text-gray-900">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Role: {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default withAuth(DashboardLayout)