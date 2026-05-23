import type { ReactNode } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "motion/react"

interface AppMotionProviderProps {
  children: ReactNode
}

/**
 * Top-level motion provider. LazyMotion + domAnimation gives us the small
 * (~20KB) feature bundle so individual components can use <m.div> without
 * each pulling in the full motion runtime.
 *
 * MotionConfig.reducedMotion="user" wires motion's animations to the
 * prefers-reduced-motion media query — animations collapse to 0ms.
 */
export function AppMotionProvider({ children }: AppMotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
