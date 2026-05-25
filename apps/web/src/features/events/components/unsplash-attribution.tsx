import { safeHref } from "@/infrastructure/safe-url"
import { cn } from "@/shared/utils/format"
import type { UnsplashImageAttribution } from "@/shared/types"

interface UnsplashAttributionProps {
  attribution?: UnsplashImageAttribution | null
  imageUrl?: string | null
  className?: string
}

export function findUnsplashAttribution(
  attributions: UnsplashImageAttribution[] | undefined,
  imageUrl: string | null | undefined
): UnsplashImageAttribution | null {
  if (!imageUrl) return null
  return attributions?.find((entry) => entry.image_url === imageUrl) ?? null
}

export function UnsplashAttribution({
  attribution,
  imageUrl,
  className,
}: UnsplashAttributionProps) {
  const resolved = attribution ?? null
  if (!resolved || resolved.image_url !== imageUrl) return null

  const photographerHref = safeHref(resolved.photographer_profile_url)
  const photoHref = safeHref(resolved.photo_url)

  if (!photographerHref || !photoHref) return null

  return (
    <p className={cn("text-[10px] leading-tight text-muted-foreground", className)}>
      Photo by{" "}
      <a
        href={photographerHref}
        target="_blank"
        rel="noreferrer"
        className="font-medium underline underline-offset-2 hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        {resolved.photographer_name}
      </a>{" "}
      on{" "}
      <a
        href={photoHref}
        target="_blank"
        rel="noreferrer"
        className="font-medium underline underline-offset-2 hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        Unsplash
      </a>
    </p>
  )
}
