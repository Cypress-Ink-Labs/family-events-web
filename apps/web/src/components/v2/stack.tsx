import type { ElementType, ReactNode } from "react"
import { cn } from "@/shared/utils/format"

type Spacing = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"

const gapClass: Record<Spacing, string> = {
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-6",
  "6": "gap-8",
  "7": "gap-12",
  "8": "gap-16",
}

type Align = "start" | "center" | "end" | "stretch" | "baseline"
const alignClass: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
}

type Justify = "start" | "center" | "end" | "between" | "around" | "evenly"
const justifyClass: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
}

type StackProps = {
  gap?: Spacing
  align?: Align
  justify?: Justify
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Vertical layout primitive. Always stacks top-to-bottom.
 * Spacing token: gap-1 = 4px, gap-4 = 16px (default), gap-5 = 24px.
 */
export function Stack({ gap = "4", align, justify, as, className, children }: StackProps) {
  const Tag = (as ?? "div") as ElementType
  return (
    <Tag
      className={cn(
        "flex flex-col",
        gapClass[gap],
        align && alignClass[align],
        justify && justifyClass[justify],
        className
      )}
    >
      {children}
    </Tag>
  )
}
