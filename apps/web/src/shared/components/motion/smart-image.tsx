import { useRef, useState, type ImgHTMLAttributes } from "react"
import { buildSrcSet } from "@family-events/shared"
import { cn } from "@/shared/utils/format"

/** Rendering variant — controls `sizes` attribute and default width. */
export type SmartImageVariant = "card" | "hero" | "thumbnail"

const SIZES_MAP: Record<SmartImageVariant, string> = {
  card: "(max-width: 640px) 100vw, 300px",
  hero: "100vw",
  thumbnail: "150px",
}

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  placeholderClassName?: string
  showPlaceholder?: boolean
  alt: string
  /** Rendering variant. Controls `sizes` and default proxy width. Default: "card". */
  variant?: SmartImageVariant
  /**
   * When true, the image loads eagerly with `fetchpriority="high"`.
   * Use for above-the-fold hero images. Default: false (lazy).
   */
  priority?: boolean
}

export function SmartImage({
  className,
  placeholderClassName,
  showPlaceholder = true,
  onLoad,
  onError,
  src,
  alt,
  variant = "card",
  priority = false,
  ...props
}: SmartImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined)
  const [useFallback, setUseFallback] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Derive loaded state inline: reset when src changes (avoids useEffect state sync).
  // If the img element is already complete (browser cache), treat as loaded immediately.
  let loaded = loadedSrc === src
  if (
    !loaded &&
    imgRef.current?.complete &&
    imgRef.current.naturalWidth > 0 &&
    imgRef.current.src === src
  ) {
    loaded = true
  }

  // Build responsive srcSet through the proxy (skip when falling back).
  const srcSet = !useFallback && src ? buildSrcSet(src) : undefined
  const sizes = srcSet ? SIZES_MAP[variant] : undefined

  return (
    <span className="relative block overflow-hidden">
      {showPlaceholder && !loaded && (
        <span
          aria-hidden="true"
          className={cn("absolute inset-0 animate-pulse bg-muted", placeholderClassName)}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        // eslint-disable-next-line react/no-unknown-property -- standard HTML attribute
        fetchPriority={priority ? "high" : undefined}
        data-loaded={loaded ? "true" : "false"}
        onLoad={(event) => {
          setLoadedSrc(src)
          onLoad?.(event)
        }}
        onError={(event) => {
          if (!useFallback && srcSet) {
            // Proxy failed — silently fall back to original URL.
            setUseFallback(true)
          } else {
            setLoadedSrc(undefined)
          }
          onError?.(event)
        }}
        className={cn("smart-image-fade", className)}
        {...props}
      />
    </span>
  )
}
