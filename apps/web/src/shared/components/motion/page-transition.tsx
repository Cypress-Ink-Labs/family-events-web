import type { ReactNode } from "react"
import { useLocation } from "react-router"
import { AnimatePresence, m } from "motion/react"
import { fadeOnlyVariants } from "./motion-presets"

interface PageTransitionProps {
  children: ReactNode
}

export const pageTransitionMode = "popLayout" as const

/**
 * Wraps route content with an overlapping cross-fade keyed on pathname. Keeps
 * the layout (header, nav) static while the page body fades between routes.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  return (
    <AnimatePresence mode={pageTransitionMode} initial={false}>
      <m.div
        key={location.pathname}
        variants={fadeOnlyVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
