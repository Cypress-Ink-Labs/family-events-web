import type { ElementType } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"

interface EmptyStateProps {
  icon: ElementType
  title: string
  description: string
  cta: string
  ctaHref: string
}

export function EmptyState({ icon: Icon, title, description, cta, ctaHref }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <Icon className="size-14 text-muted-foreground/25 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-5">{description}</p>
      <Button asChild>
        <Link to={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}
