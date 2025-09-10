"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, withAuth, type UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchModal from "@/components/SearchModal";
import NotificationsDropdown from "@/components/NotificationsDropdown";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Income & Expenses",
    href: "/transactions",
    icon: ArrowUpDown,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Offerings & Tithes",
    href: "/offerings",
    icon: Gift,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    roles: ["treasurer", "admin"],
  },
  {
    name: "Member Contributions",
    href: "/member-contributions",
    icon: TrendingUp,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Fund Management",
    href: "/funds",
    icon: Wallet,
    roles: ["treasurer", "admin"],
  },
  {
    name: "Cash Breakdown",
    href: "/cash-breakdown",
    icon: Banknote,
    roles: ["treasurer", "admin"],
  },
  {
    name: "Bills & Petty Cash",
    href: "/bills",
    icon: Receipt,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Ledger Entries",
    href: "/ledger-entries",
    icon: FileText,
    roles: ["viewer", "treasurer", "admin"],
  },
  {
    name: "Advances",
    href: "/advances",
    icon: CreditCard,
    roles: ["treasurer", "admin"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["viewer", "treasurer", "admin"],
  },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, signOut, hasRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredNavigation = navigation.filter((item) =>
    item.roles.some((role) => hasRole(role as UserRole))
  );

  if (!mounted) {
    return null;
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-white/5 backdrop-blur-sm border-r border-white/10 transition-all duration-300 ease-in-out",
      mobile ? "w-full" : isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-white/10",
        !mobile && isCollapsed ? "justify-center" : ""
      )}>
        <div className="flex items-center">
          <div className="bg-white/10 p-2 rounded-lg">
            <Church className="h-6 w-6 text-white" />
          </div>
          {(!isCollapsed || mobile) && (
            <div className="ml-3">
              <span className="text-white font-semibold text-lg">
                Church Finance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-4 space-y-2 overflow-y-auto", mobile ? "px-6" : "px-3")}>
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center w-full text-sm font-medium rounded-lg transition-all duration-200",
                mobile ? "px-4 py-3" : isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
              title={!mobile && isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-200", 
                !mobile && !isCollapsed ? "mr-3" : ""
              )} />
              {(!isCollapsed || mobile) && (
                <span className="transition-opacity duration-200">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className={cn("border-t border-white/10", mobile ? "p-6" : "p-4")}>
        <div className="bg-white/5 rounded-lg p-3">
          <div className={cn(
            "flex items-center transition-all duration-200",
            !mobile && isCollapsed ? "justify-center" : "space-x-3"
          )}>
            <Avatar className="h-8 w-8 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-white font-semibold text-xs">
                {user?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || mobile) && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate text-xs">
                  {user?.full_name || user?.email}
                </p>
                <div className="mt-1">
                  <p className="text-white/60 capitalize text-xs">
                    {user?.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="p-0 w-80 sm:w-72 bg-black/90 backdrop-blur-xl border-white/10"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar mobile />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {/* Desktop sidebar toggle button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                  onClick={toggleSidebar}
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                
                {/* Page title */}
                <h1 className="text-lg font-semibold text-white">
                  {navigation.find((item) => item.href === pathname)?.name ||
                    "Dashboard"}
                </h1>
              </div>

              {/* Header actions */}
              <div className="flex items-center space-x-2">
                {/* Search button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <NotificationsDropdown className="hidden md:block" />

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-1 rounded-full hover:bg-white/10"
                    >
                      <Avatar className="h-8 w-8 border border-white/20">
                        <AvatarFallback className="bg-white/10 text-white font-semibold text-xs">
                          {user?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || user?.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 bg-black/90 backdrop-blur-xl border-white/10 text-white"
                    align="end"
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {user?.full_name || "User"}
                        </p>
                        <p className="text-xs text-white/60">{user?.email}</p>
                        <p className="text-xs text-white/60 capitalize">
                          {user?.role}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => router.push("/profile-settings")}
                      className="hover:bg-white/10 cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/preferences")}
                      className="hover:bg-white/10 cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Preferences
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="hover:bg-red-500/20 text-red-300 hover:text-red-200"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 min-h-full">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </div>
  );
}

export default withAuth(DashboardLayout);