import { LayoutGrid, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/utils/format"
import {
  EXPLORE_COLUMN_OPTIONS,
  EXPLORE_LAYOUT_OPTIONS,
  EXPLORE_SORT_OPTIONS,
  type ExploreColumns,
  type ExploreLayout,
  type ExploreSortOption,
} from "@/features/explore/constants/view"

interface ExploreViewControlsProps {
  layout: ExploreLayout
  columns: ExploreColumns
  sort: ExploreSortOption
  showImages: boolean
  onLayoutChange: (layout: ExploreLayout) => void
  onColumnsChange: (columns: ExploreColumns) => void
  onSortChange: (sort: ExploreSortOption) => void
  onShowImagesChange: (showImages: boolean) => void
}

const pillClass = (active: boolean) =>
  cn(
    "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:text-foreground"
  )

const sectionLabel =
  "text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-3"

export function ExploreViewControls({
  layout,
  columns,
  sort,
  showImages,
  onLayoutChange,
  onColumnsChange,
  onSortChange,
  onShowImagesChange,
}: ExploreViewControlsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 px-4 gap-2 border-border/60">
          <LayoutGrid className="size-4" />
          View
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 gap-0" showCloseButton={false}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-border/60 flex-shrink-0">
          <SheetTitle className="text-sm font-semibold tracking-tight">View</SheetTitle>
          <SheetClose className="rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-6">
            <div>
              <p className={sectionLabel}>Layout</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPLORE_LAYOUT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => onLayoutChange(option.value)}
                    className={pillClass(layout === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {layout === "grid" && (
              <div>
                <p className={sectionLabel}>Cards per row</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPLORE_COLUMN_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => onColumnsChange(option)}
                      className={pillClass(columns === option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={sectionLabel}>Sort by</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPLORE_SORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => onSortChange(option.value)}
                    className={pillClass(sort === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label
              htmlFor="show-images-switch"
              className={cn(
                "flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150",
                showImages ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
              )}
            >
              <span className="text-sm font-medium select-none">Show images</span>
              <Switch
                id="show-images-switch"
                checked={showImages}
                onCheckedChange={onShowImagesChange}
              />
            </label>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
