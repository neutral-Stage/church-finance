"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, withAuth, type UserRole } from "@/contexts/AuthContext";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { AIChatButton } from "@/components/ai-chat-button";
import { ChurchProvider } from "@/contexts/ChurchContext";
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
  Shield,
  UserCog,
  Building2,
  Bot,
  ClipboardList,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchModal from "@/components/SearchModal";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { HeaderChurchSelector } from "@/components/header-church-selector";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDEBAR_COLLAPSE_KEY = "cf-sidebar-collapsed";

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
    name: "Approvals",
    href: "/approvals",
    icon: ClipboardCheck,
    roles: ["treasurer", "admin"],
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

const adminNavigation = [
  {
    name: "Churches",
    href: "/admin/churches",
    icon: Building2,
    roles: ["admin"],
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    name: "Roles",
    href: "/admin/roles",
    icon: Shield,
    roles: ["admin"],
  },
  {
    name: "User Roles",
    href: "/admin/user-roles",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    name: "Audit Log",
    href: "/admin/audit",
    icon: ClipboardList,
    roles: ["admin"],
  },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const { user, signOut, hasRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Restore persisted sidebar collapse state
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  // Ctrl+K / Cmd+K opens the command palette (search)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      } catch {
        // ignore storage access errors
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredNavigation = navigation.filter((item) =>
    item.roles.some((role) => hasRole(role as UserRole))
  );

  const filteredAdminNavigation = adminNavigation.filter((item) =>
    item.roles.some((role) => hasRole(role as UserRole))
  );

  const renderNavItem = (
    item: { name: string; href: string; icon: typeof LayoutDashboard },
    mobile: boolean
  ) => {
    const isActive = pathname === item.href;
    return (
      <button
        key={item.name}
        onClick={() => {
          router.push(item.href);
          if (mobile) setSidebarOpen(false);
        }}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center w-full text-sm font-medium rounded-lg transition-colors",
          mobile ? "px-4 py-3" : isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        title={!mobile && isCollapsed ? item.name : undefined}
      >
        <item.icon
          className={cn("h-5 w-5 shrink-0", !mobile && !isCollapsed ? "mr-3" : "")}
        />
        {(!isCollapsed || mobile) && <span>{item.name}</span>}
      </button>
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full w-full bg-card border-r border-border">
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-border",
          !mobile && isCollapsed ? "justify-center" : ""
        )}
      >
        <div className="flex items-center">
          <div className="bg-primary/10 text-primary p-2 rounded-lg">
            <Church className="h-6 w-6" />
          </div>
          {(!isCollapsed || mobile) && (
            <div className="ml-3">
              <span className="text-foreground font-semibold text-lg">
                Church Finance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className={cn(
          "flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar",
          mobile ? "px-4" : "px-3"
        )}
      >
        {/* Main Navigation */}
        {filteredNavigation.map((item) => renderNavItem(item, mobile))}

        {/* Admin Section */}
        {filteredAdminNavigation.length > 0 && (
          <>
            <div
              className={cn(
                "border-t border-border mt-4 pt-4",
                !mobile && isCollapsed ? "mx-1" : "mx-1"
              )}
            >
              {(!isCollapsed || mobile) && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Administration
                </h3>
              )}
            </div>
            {filteredAdminNavigation.map((item) => renderNavItem(item, mobile))}
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className={cn("border-t border-border", mobile ? "p-4" : "p-4")}>
        <div className="bg-muted/50 rounded-lg p-3">
          <div
            className={cn(
              "flex items-center",
              !mobile && isCollapsed ? "justify-center" : "space-x-3"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {user?.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("") || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || mobile) && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-xs">
                  {user?.full_name || user?.email}
                </p>
                <div className="mt-1">
                  <p className="text-muted-foreground capitalize text-xs">
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
    <ChurchProvider>
      <div className="min-h-screen bg-background relative">
        <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div
          className={cn(
            "hidden lg:flex transition-[width] duration-300 ease-in-out will-change-[width]",
            isCollapsed ? "w-20" : "w-64"
          )}
        >
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="p-0 w-80 sm:w-72 bg-card border-border"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar mobile />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 lg:flex-none flex flex-col transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden",
            isCollapsed ? "lg:w-[calc(100%-5rem)]" : "lg:w-[calc(100%-16rem)]"
          )}
        >
          {/* Header */}
          <header className="bg-card border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* Desktop sidebar toggle button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex"
                  onClick={toggleSidebar}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>

                {/* Page title */}
                <h1 className="text-lg font-semibold text-foreground">
                  {navigation.find((item) => item.href === pathname)?.name ||
                    adminNavigation.find((item) => item.href === pathname)?.name ||
                    "Dashboard"}
                </h1>
              </div>

              {/* Header actions */}
              <div className="flex items-center space-x-1">
                {/* Church Selector */}
                <HeaderChurchSelector className="hidden sm:flex" />

                {/* Search button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search (Ctrl+K)"
                  title="Search (Ctrl+K)"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Theme toggle */}
                <ThemeToggle />

                {/* AI Chat button in header */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAiChatOpen((prev) => !prev)}
                  aria-label="AI Assistant"
                  title="AI Assistant"
                  className={cn(
                    aiChatOpen && "bg-primary/10 text-primary"
                  )}
                >
                  <Bot className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <NotificationsDropdown className="hidden md:block" />

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {user?.full_name
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("") || user?.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {user?.full_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user?.role}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push("/profile-settings")}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/preferences")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Preferences
                    </DropdownMenuItem>
                    {hasRole("admin") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => router.push("/admin/churches")}
                          className="cursor-pointer text-primary"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Administration
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
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
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-4 sm:p-6 min-h-full">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* AI Chat Panel */}
        <AIChatPanel isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />

        {/* AI Chat FAB - only show when panel is closed */}
        {!aiChatOpen && (
          <AIChatButton onClick={() => setAiChatOpen(true)} isOpen={aiChatOpen} />
        )}
        </div>
      </div>
    </ChurchProvider>
  );
}

export default withAuth(DashboardLayout);
