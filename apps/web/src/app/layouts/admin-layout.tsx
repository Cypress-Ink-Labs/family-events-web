import { Outlet, Link, useLocation, Navigate } from "react-router-dom"
import {
  LayoutDashboard,
  Database,
  Calendar,
  MapPin,
  MessageSquare,
  Star,
  FileText,
  Ticket,
  Users,
  ArrowLeft,
  Zap,
  CalendarClock,
} from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/lib/access-control"
import { FadeSwap, PageTransition } from "@/components/motion"

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/sources", label: "Event Sources", icon: Database },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/cities", label: "Cities", icon: MapPin },
  { to: "/admin/comments", label: "Comments", icon: MessageSquare },
  { to: "/admin/ratings", label: "Ratings", icon: Star },
  { to: "/admin/access", label: "Access", icon: Users },
  { to: "/admin/invites", label: "Invite Codes", icon: Ticket },
  { to: "/admin/logs", label: "Ingestion Logs", icon: FileText },
  { to: "/admin/crons", label: "Scheduled Jobs", icon: CalendarClock },
]

export function AdminLayout() {
  const { isAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <FadeSwap stateKey="admin-loading">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </FadeSwap>
    )
  }

  if (!isAdmin) {
    return <Navigate to={HOME_PATH} replace />
  }

  function isActive(to: string, exact?: boolean) {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-bold text-sidebar-foreground">Family Events</p>
                <p className="text-xs text-sidebar-foreground/60">Admin Dashboard</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV.map(({ to, label, icon: Icon, exact }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild isActive={isActive(to, exact)} tooltip={label}>
                        <Link to={to}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to site">
                  <Link to={HOME_PATH}>
                    <ArrowLeft />
                    <span>Back to Site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex items-center h-14 px-6 border-b border-border/60 bg-background sticky top-0 z-30">
            <SidebarTrigger className="-ml-2 mr-4" />
            <h1 className="text-sm font-semibold text-foreground">
              {ADMIN_NAV.find((n) => isActive(n.to, n.exact))?.label ?? "Admin"}
            </h1>
          </header>
          <div className="flex-1 p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
