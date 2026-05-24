import type { Variants } from "motion/react"

const ease = [0.22, 1, 0.36, 1] as const

export const fadeInUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease } },
}

export const fadeOnlyVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease } },
  exit: { opacity: 0, transition: { duration: 0.15, ease } },
}

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
  exit: {
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
}

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease } },
}

export const popInVariants: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 360, damping: 26 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12, ease } },
}
