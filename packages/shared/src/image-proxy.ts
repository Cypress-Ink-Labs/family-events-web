/**
 * Framework-agnostic image proxy URL builder.
 *
 * Default proxy: wsrv.nl (free, WebP-capable, no hosting needed).
 * Future: self-hosted imgproxy via IMAGE_PROXY_BASE_URL override.
 */

/** Supported output formats. */
export type ImageFormat = "webp" | "auto"

export interface ProxyUrlOptions {
  /** Original image URL (must be absolute http/https). */
  src: string
  /** Desired width in pixels. */
  width: number
  /** Output format. Defaults to "webp". */
  format?: ImageFormat
  /**
   * Base URL for a self-hosted proxy. When omitted, wsrv.nl is used.
   * Typically sourced from an env var at build time.
   */
  proxyBaseUrl?: string
}

/** Standard widths used in srcSet generation. */
export const IMAGE_WIDTHS = [300, 600, 900, 1200] as const

const WSRV_BASE = "https://wsrv.nl/"

/**
 * Build a proxy URL for the given image source and width.
 *
 * Returns `null` when the input is not a valid absolute http(s) URL,
 * allowing callers to fall back to the original source.
 */
export function buildProxyUrl(options: ProxyUrlOptions): string | null {
  const { src, width, format = "webp", proxyBaseUrl } = options

  if (!isValidHttpUrl(src)) return null

  const base = proxyBaseUrl ?? WSRV_BASE

  if (!proxyBaseUrl || base === WSRV_BASE) {
    // wsrv.nl format: ?url=<encoded>&w=<width>&output=<format>
    const params = new URLSearchParams()
    params.set("url", src)
    params.set("w", String(width))
    if (format !== "auto") {
      params.set("output", format)
    }
    return `${WSRV_BASE}?${params.toString()}`
  }

  // Self-hosted imgproxy style: /resize:fit:{width}/plain/{encoded_url}@{format}
  const encodedSrc = encodeURIComponent(src)
  const suffix = format === "auto" ? "" : `@${format}`
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base
  return `${normalized}/resize:fit:${width}/plain/${encodedSrc}${suffix}`
}

/**
 * Generate a srcSet string for all standard widths.
 *
 * Returns `undefined` when the source URL is invalid (callers can
 * fall back to a plain `src`).
 */
export function buildSrcSet(
  src: string,
  options?: { format?: ImageFormat; proxyBaseUrl?: string },
): string | undefined {
  if (!isValidHttpUrl(src)) return undefined

  const entries: string[] = []
  for (const w of IMAGE_WIDTHS) {
    const url = buildProxyUrl({ src, width: w, ...options })
    if (url) entries.push(`${url} ${w}w`)
  }

  return entries.length > 0 ? entries.join(", ") : undefined
}

/** Returns true for absolute http(s) URLs. */
function isValidHttpUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
