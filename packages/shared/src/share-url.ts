/**
 * Build a shareable URL for an event.
 *
 * Uses the `/share/:eventId` path which is handled by the share-og edge
 * function to render Open Graph meta tags for rich link previews.
 */
export function buildShareUrl(baseUrl: string, eventId: string): string {
  const base = baseUrl.replace(/\/+$/, "")
  return `${base}/share/${eventId}`
}
