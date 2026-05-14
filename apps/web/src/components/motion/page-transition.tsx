import type { ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { AnimatePresence, m } from "motion/react"
import { fadeOnlyVariants } from "./motion-presets"

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Wraps route content with a cross-fade keyed on pathname. Keeps the layout
 * (header, nav) static while the page body fades between routes.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
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
