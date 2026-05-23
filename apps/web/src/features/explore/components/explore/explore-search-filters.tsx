import { Check, Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/shared/utils/format"
import type { Tag } from "@/shared/types"
import {
  EXPLORE_AGE_OPTIONS,
  EXPLORE_DATE_QUICK_FILTERS,
} from "@/features/explore/constants/categories"

interface ExploreSearchFiltersProps {
  keyword: string
  activeFilterCount: number
  activeDateFilter: string | null
  selectedAge: string | null
  onlyFree: boolean
  selectedTagSlugs: string[]
  tags: Tag[]
  onKeywordChange: (value: string) => void
  onClearKeyword: () => void
  onDateFilterChange: (value: string | null) => void
  onAgeChange: (value: string | null) => void
  onOnlyFreeChange: (value: boolean) => void
  onToggleTagSlug: (slug: string) => void
  onClearAllFilters: () => void
}

export function ExploreSearchFilters({
  keyword,
  activeFilterCount,
  activeDateFilter,
  selectedAge,
  onlyFree,
  selectedTagSlugs,
  tags,
  onKeywordChange,
  onClearKeyword,
  onDateFilterChange,
  onAgeChange,
  onOnlyFreeChange,
  onToggleTagSlug,
  onClearAllFilters,
}: ExploreSearchFiltersProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="Find activities nearby..."
          className="pl-9 bg-muted border-0 h-11"
        />
        {keyword && (
          <button
            onClick={onClearKeyword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-11 px-4 gap-2 border-border/60 relative">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 gap-0" showCloseButton={false}>
          <div className="flex items-center justify-between px-5 h-14 border-b border-border/60 flex-shrink-0">
            <SheetTitle className="text-sm font-semibold tracking-tight">Filters</SheetTitle>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={onClearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
              <SheetClose className="rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-3">
                  When
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPLORE_DATE_QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() =>
                        onDateFilterChange(activeDateFilter === filter.value ? null : filter.value)
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                        activeDateFilter === filter.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-3">
                  Kid&apos;s Age
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPLORE_AGE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        onAgeChange(selectedAge === option.label ? null : option.label)
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                        selectedAge === option.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label
                htmlFor="free-only-switch"
                className={cn(
                  "flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150",
                  onlyFree ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium select-none">Free events only</span>
                <Switch
                  id="free-only-switch"
                  checked={onlyFree}
                  onCheckedChange={onOnlyFreeChange}
                />
              </label>

              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-2">
                  Tags
                </p>
                <div className="flex flex-col gap-0.5">
                  {tags.slice(0, 8).map((tag) => {
                    const isSelected = selectedTagSlugs.includes(tag.slug)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onToggleTagSlug(tag.slug)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left",
                          isSelected
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        style={isSelected ? { backgroundColor: `${tag.color}20` } : {}}
                      >
                        <span
                          className="size-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1">{tag.name}</span>
                        {isSelected && (
                          <Check className="size-3.5 text-foreground/40 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
