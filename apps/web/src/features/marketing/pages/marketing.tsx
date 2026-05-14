import { Link } from "react-router-dom"
import { ArrowRight, CalendarDays, MapPinned, ShieldCheck, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const HIGHLIGHTS = [
  {
    icon: CalendarDays,
    title: "Curated events",
    description: "A private launch catalog of family events, classes, and weekend plans.",
  },
  {
    icon: MapPinned,
    title: "City-aware discovery",
    description: "Explore nearby activities with maps, filters, and saved picks once invited.",
  },
  {
    icon: ShieldCheck,
    title: "Closed release",
    description:
      "Access is limited to invited accounts while the product is still in early rollout.",
  },
]

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary">
              <span className="text-lg font-black text-primary-foreground">F</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Family<span className="text-primary">Events</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/sign-up">Use Invite</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <Badge variant="outline" className="gap-2 px-3 py-1 text-xs font-semibold">
                <Ticket className="size-3.5" />
                Invite-only launch
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Family event discovery for parents who want fewer tabs and better plans.
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Family Events is in a closed rollout. Invited families can sign in to browse
                  curated events, save favorites, and plan the week in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/sign-up">
                    Sign up with invite <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/sign-in">Already invited?</Link>
                </Button>
              </div>
            </section>

            <section className="grid gap-4">
              {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-border/60">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">{title}</h2>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
