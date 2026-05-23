import type { ReactNode } from "react"
import { AnimatePresence, m } from "motion/react"
import { cn } from "@/shared/utils/format"
import { fadeInUpVariants } from "./motion-presets"

interface FadeSwapProps {
  /**
   * A stable key per state. When this changes, motion runs an exit on the
   * previous content and an enter on the new content. Use short identifiers
   * like "loading", "error", "empty", "content".
   */
  stateKey: string
  children: ReactNode
  className?: string
  /**
   * "wait" cross-fades sequentially (recommended for skeleton -> content).
   * "popLayout" lets the new content mount before the old one finishes, which
   * is useful when you want layout to settle quickly.
   */
  mode?: "wait" | "popLayout" | "sync"
}

export function FadeSwap({ stateKey, children, className, mode = "wait" }: FadeSwapProps) {
  return (
    <AnimatePresence mode={mode} initial={false}>
      <m.div
        key={stateKey}
        variants={fadeInUpVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(className)}
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
