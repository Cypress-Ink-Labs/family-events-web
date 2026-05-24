import { useRef, useState, type ImgHTMLAttributes } from "react"
import { cn } from "@/shared/utils/format"

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  placeholderClassName?: string
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
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined)
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
          setLoadedSrc(src)
          onLoad?.(event)
        }}
        onError={(event) => {
          setLoadedSrc(undefined)
          onError?.(event)
        }}
        className={cn("smart-image-fade", className)}
        {...props}
      />
    </span>
  )
}
