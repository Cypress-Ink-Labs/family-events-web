import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface DashboardHeaderProps {
  greeting: string
  childName?: string | null
  userInitial?: string
  avatarUrl?: string | null
  showAvatar: boolean
}

export function DashboardHeader({
  greeting,
  childName,
  userInitial,
  avatarUrl,
  showAvatar,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Dashboard
        </p>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight text-balance">
          {greeting}
        </h1>
        {childName && (
          <p className="text-muted-foreground mt-1 text-sm">
            You have adventures planned for {childName} this week.
          </p>
        )}
      </div>
      {showAvatar && (
        <Avatar className="size-11 border-2 border-primary/20">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {userInitial ?? "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
