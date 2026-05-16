import type { ReactNode } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { m } from "motion/react"
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Compass,
  Hop as Home,
  LogOut,
  Map as MapIcon,
  Search,
  Shield,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HOME_PATH } from "@/lib/access-control"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useBreakpoint } from "@/hooks/use-breakpoint"
import { PageTransition } from "@/components/motion"

const PRIMARY_TABS = [
  { to: HOME_PATH, label: "Plan", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/saved", label: "Saved", icon: Bookmark },
] as const

const DESKTOP_NAV_ITEMS = [
  { to: HOME_PATH, label: "Plan", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
] as const

interface AppLayoutProps {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut, isAdmin } = useAuth()
  const { selectedCity, setSelectedCity, cities } = useApp()
  const { isBelow } = useBreakpoint()
  const isMobile = isBelow("md")

  function isActive(to: string): boolean {
    if (to === HOME_PATH) return location.pathname === HOME_PATH
    return location.pathname.startsWith(to)
  }

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
          <Link
            to={HOME_PATH}
            className="flex shrink-0 items-center gap-2 min-h-[44px] min-w-[44px]"
            aria-label="Family Events home"
          >
            <span
              className="flex size-8 items-center justify-center rounded-md font-display text-sm font-medium text-primary-foreground"
              style={{ background: "var(--color-accent-primary)" }}
            >
              F
            </span>
            <span className="hidden font-display text-lg font-medium tracking-tight text-foreground sm:block">
              Family Events
            </span>
          </Link>

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
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-h-[44px] min-w-[44px]"
              asChild
            >
              <Link to="/explore" aria-label="Search events">
                <Search className="size-4" />
              </Link>
            </Button>

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
            {DESKTOP_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative inline-flex min-h-[44px] items-center gap-1.5 px-3 py-3 font-body text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {active ? (
                    <m.span
                      layoutId="desktop-nav-active"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                    />
                  ) : null}
                </Link>
              )
            })}
            {isAdmin ? (
              <Link
                to="/admin"
                className={cn(
                  "relative ml-auto inline-flex min-h-[44px] items-center gap-1.5 px-3 py-3 font-body text-sm font-medium transition-colors",
                  location.pathname.startsWith("/admin")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="size-4" />
                Admin
              </Link>
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
          <div className="mx-auto grid max-w-[640px] grid-cols-3">
            {PRIMARY_TABS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2 font-body text-xs",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative inline-flex size-9 items-center justify-center rounded-lg">
                    {active ? (
                      <m.span
                        layoutId="mobile-nav-active"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-primary/12"
                      />
                    ) : null}
                    <Icon className="relative z-10 size-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-none">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
