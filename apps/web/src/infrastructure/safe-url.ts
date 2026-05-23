// URL scheme guards for DB- or scraper-sourced URLs.
//
// Anywhere we render external URLs in href= or src= attributes, route through
// these helpers. Rendering `<a href={event.source_url}>` directly is XSS-prone
// (`javascript:` URIs execute on click; rel="noopener noreferrer" does NOT block
// them). Image URLs are safer in modern browsers (script schemes won't load as
// images), but the same allowlist applies as defense-in-depth.

const SAFE_HREF_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"])
const SAFE_IMG_SCHEMES = new Set(["http:", "https:"])

function parseScheme(url: string): string | null {
  try {
    return new URL(url).protocol.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Returns the URL if its scheme is safe to use in an anchor href, otherwise "#".
 * Allows http(s), mailto, and tel.
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#"
  const scheme = parseScheme(url)
  if (!scheme) return "#"
  return SAFE_HREF_SCHEMES.has(scheme) ? url : "#"
}

/**
 * Returns the URL if its scheme is safe to use as an image src, otherwise undefined.
 * Allows only http(s). Returning undefined lets callers fall back to a placeholder.
 */
export function safeImageSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const scheme = parseScheme(url)
  if (!scheme) return undefined
  return SAFE_IMG_SCHEMES.has(scheme) ? url : undefined
}
