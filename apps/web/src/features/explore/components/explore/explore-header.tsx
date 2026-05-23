interface ExploreHeaderProps {
  cityName?: string | null
}

export function ExploreHeader({ cityName }: ExploreHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground tracking-tight">
        Today&apos;s adventures, <span className="text-primary italic">hand-picked</span> for them.
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        Discover the best family-friendly events in {cityName ?? "your city"}, curated for every
        stage of play.
      </p>
    </div>
  )
}
