import type { ReactNode } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"
import { m } from "motion/react"
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Compass,
  Hop as Home,
  LogOut,
  Map as MapIcon,
  Shield,
  User,
} from "lucide-react"
import { cn } from "@/shared/utils/format"
import { Button } from "@/shared/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { HOME_PATH } from "@/shared/access-control"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useBreakpoint } from "@/shared/hooks/use-breakpoint"
import { PageTransition } from "@/shared/components/motion"
import { BrandLogo } from "@/shared/components/brand-logo"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { NotificationBell } from "@/features/notifications/components/notification-bell"

const PRIMARY_TABS = [
  { to: HOME_PATH, label: "Plan", icon: Home, auth: true },
  { to: "/explore", label: "Explore", icon: Compass, auth: false },
  { to: "/saved", label: "Saved", icon: Bookmark, auth: true },
] as const

const DESKTOP_NAV_ITEMS = [
  { to: HOME_PATH, label: "Plan", icon: Home, auth: true },
  { to: "/explore", label: "Explore", icon: Compass, auth: false },
  { to: "/map", label: "Map", icon: MapIcon, auth: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, auth: false },
  { to: "/saved", label: "Saved", icon: Bookmark, auth: true },
  { to: "/profile", label: "Profile", icon: User, auth: true },
] as const

interface AppLayoutProps {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const { user, profile, signOut, isAdmin } = useAuth()
  const { selectedCity, setSelectedCity, cities } = useApp()
  const { isBelow } = useBreakpoint()
  const isMobile = isBelow("md")

  async function handleSignOut(): Promise<void> {
    await signOut()
    navigate("/sign-in")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top app bar */}
      <header
        className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          <BrandLogo to={HOME_PATH} className="shrink-0" textClassName="hidden sm:inline" />

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:max-w-xs">
            <Select
              value={selectedCity?.id ?? ""}
              onValueChange={(val) => {
                const city = cities.find((c) => c.id === val)
                if (city) setSelectedCity(city)
              }}
            >
              <SelectTrigger className="h-9 min-h-[44px] border-0 bg-muted text-sm">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {user ? <NotificationBell /> : null}
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-[44px] gap-1 px-2"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-7">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback
                        className="text-[11px] font-medium"
                        style={{
                          background: "var(--color-accent-primary)",
                          color: "var(--color-bg)",
                        }}
                      >
                        {profile?.display_name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-display text-sm font-medium leading-tight">
                      {profile?.display_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="gap-2">
                      <User className="size-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/map" className="gap-2">
                      <MapIcon className="size-4" /> Map
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/calendar" className="gap-2">
                      <CalendarDays className="size-4" /> Calendar
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="gap-2 text-primary">
                          <Shield className="size-4" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-10 min-h-[44px] text-sm" asChild>
                  <Link to="/sign-in">Sign In</Link>
                </Button>
                <Button size="sm" className="h-10 min-h-[44px] text-sm" asChild>
                  <Link to="/sign-up">Join Free</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop secondary nav (md+) */}
      {!isMobile ? (
        <nav className="sticky top-14 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] items-center gap-1 px-4 md:px-6 lg:px-8">
            {DESKTOP_NAV_ITEMS.filter((item) => !item.auth || user).map(
              ({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === HOME_PATH}
                  className={({ isActive }) =>
                    cn(
                      "relative inline-flex min-h-[44px] items-center gap-1.5 px-3 py-3 font-body text-sm font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="size-4" />
                      {label}
                      {isActive ? (
                        <m.span
                          layoutId="desktop-nav-active"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                        />
                      ) : null}
                    </>
                  )}
                </NavLink>
              )
            )}
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    "relative ml-auto inline-flex min-h-[44px] items-center gap-1.5 px-3 py-3 font-body text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Shield className="size-4" />
                Admin
              </NavLink>
            ) : null}
          </div>
        </nav>
      ) : null}

      {/* Page content */}
      <main className={cn("flex-1", isMobile && "pb-[calc(72px+env(safe-area-inset-bottom,0px))]")}>
        <PageTransition>{children ?? <Outlet />}</PageTransition>
      </main>

      {/* Mobile bottom tab bar — 3 primary tabs (Plan / Explore / Saved) */}
      {isMobile ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label="Primary"
        >
          <div
            className="mx-auto grid max-w-[640px]"
            style={{
              gridTemplateColumns: `repeat(${PRIMARY_TABS.filter((t) => !t.auth || user).length}, 1fr)`,
            }}
          >
            {PRIMARY_TABS.filter((item) => !item.auth || user).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === HOME_PATH}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2 font-body text-xs",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative inline-flex size-9 items-center justify-center rounded-lg">
                      {isActive ? (
                        <m.span
                          layoutId="mobile-nav-active"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-primary/12"
                        />
                      ) : null}
                      <Icon className="relative z-10 size-5" />
                    </span>
                    <span className="text-[11px] font-medium leading-none">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
