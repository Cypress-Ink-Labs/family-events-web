import type { ComponentPropsWithoutRef } from "react"
import { m } from "motion/react"
import { cn } from "@/lib/utils"
import { staggerContainerVariants, staggerItemVariants } from "./motion-presets"

type DivProps = ComponentPropsWithoutRef<typeof m.div>

interface StaggerListProps extends Omit<DivProps, "variants" | "initial" | "animate" | "exit"> {
  className?: string
}

/**
 * Container that drives a stagger animation. Use with <StaggerItem> children
 * to fade items in sequentially as a list/grid mounts.
 */
export function StaggerList({ className, children, ...rest }: StaggerListProps) {
  return (
    <m.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(className)}
      {...rest}
    >
      {children}
    </m.div>
  )
}

interface StaggerItemProps extends Omit<DivProps, "variants"> {
  className?: string
}

export function StaggerItem({ className, children, ...rest }: StaggerItemProps) {
  return (
    <m.div variants={staggerItemVariants} className={cn(className)} {...rest}>
      {children}
    </m.div>
  )
}
