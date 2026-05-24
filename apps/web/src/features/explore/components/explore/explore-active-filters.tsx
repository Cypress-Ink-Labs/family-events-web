import { X } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { Badge } from "@/shared/components/ui/badge"
import { popInVariants } from "@/shared/components/motion"
import type { Tag } from "@/shared/types"

interface ExploreActiveFiltersProps {
  onlyFree: boolean
  activeCategory: string | null
  selectedTagSlugs: string[]
  tags: Tag[]
  onOnlyFreeChange: (value: boolean) => void
  onActiveCategoryChange: (value: string | null) => void
  onToggleTagSlug: (slug: string) => void
}

export function ExploreActiveFilters({
  onlyFree,
  activeCategory,
  selectedTagSlugs,
  tags,
  onOnlyFreeChange,
  onActiveCategoryChange,
  onToggleTagSlug,
}: ExploreActiveFiltersProps) {
  if (!onlyFree && !activeCategory && selectedTagSlugs.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence initial={false}>
        {onlyFree && (
          <m.div
            key="filter-free"
            layout
            variants={popInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Badge variant="secondary" className="gap-1">
              Free only
              <button type="button" onClick={() => onOnlyFreeChange(false)}>
                <X className="size-3" />
              </button>
            </Badge>
          </m.div>
        )}
        {activeCategory && (
          <m.div
            key={`filter-cat-${activeCategory}`}
            layout
            variants={popInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Badge variant="secondary" className="gap-1 capitalize">
              {activeCategory}
              <button type="button" onClick={() => onActiveCategoryChange(null)}>
                <X className="size-3" />
              </button>
            </Badge>
          </m.div>
        )}
        {selectedTagSlugs.map((slug) => {
          const tag = tags.find((item) => item.slug === slug)
          return tag ? (
            <m.div
              key={`filter-tag-${slug}`}
              layout
              variants={popInVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Badge variant="secondary" className="gap-1">
                {tag.name}
                <button type="button" onClick={() => onToggleTagSlug(slug)}>
                  <X className="size-3" />
                </button>
              </Badge>
            </m.div>
          ) : null
        })}
      </AnimatePresence>
    </div>
  )
}
