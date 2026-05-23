import { cn } from "@/shared/utils/format"
import { EXPLORE_CATEGORIES } from "@/features/explore/constants/categories"

interface ExploreCategoryGridProps {
  keyword: string
  activeCategory: string | null
  onActiveCategoryChange: (value: string | null) => void
}

export function ExploreCategoryGrid({
  keyword,
  activeCategory,
  onActiveCategoryChange,
}: ExploreCategoryGridProps) {
  if (keyword || activeCategory) {
    return null
  }

  return (
    <section>
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Explore by Joy
      </p>
      <p className="text-xs text-muted-foreground mb-3">Whatever they&apos;re into today</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EXPLORE_CATEGORIES.map(({ label, icon: Icon, slug, color }) => (
          <button
            key={slug}
            onClick={() => onActiveCategoryChange(activeCategory === slug ? null : slug)}
            className={cn(
              "rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all hover:scale-[1.02]",
              activeCategory === slug
                ? "border-primary bg-primary/5"
                : "border-border/60 bg-card hover:border-primary/30"
            )}
          >
            <div className={cn("size-10 rounded-xl flex items-center justify-center", color)}>
              <Icon className="size-5" />
            </div>
            <span className="text-xs font-semibold text-center text-foreground leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
