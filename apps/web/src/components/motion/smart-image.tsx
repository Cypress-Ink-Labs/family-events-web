import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Optional skeleton overlay color. Defaults to bg-muted. */
  placeholderClassName?: string
  /** Whether to render a skeleton behind the image while it loads. */
  showPlaceholder?: boolean
  alt: string
}

export function SmartImage({
  className,
  placeholderClassName,
  showPlaceholder = true,
  onLoad,
  onError,
  src,
  alt,
  ...props
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setLoaded(false)
    const node = imgRef.current
    if (node?.complete && node.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

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
        alt={alt}
        data-loaded={loaded ? "true" : "false"}
        onLoad={(event) => {
          setLoaded(true)
          onLoad?.(event)
        }}
        onError={(event) => {
          setLoaded(false)
          onError?.(event)
        }}
        className={cn("smart-image-fade", className)}
        {...props}
      />
    </span>
  )
}
