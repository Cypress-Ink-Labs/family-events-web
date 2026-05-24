/**
 * Page-size defaults used by paginated queries. Admin lists pull more rows per
 * page because admins drive bulk operations off the same view.
 */

const DEFAULT_PAGE_SIZE = 100
export const ADMIN_PAGE_SIZE = 200

/**
 * Page-size choices the admin events toolbar surfaces. Tradeoff per option:
 *   - 50/100: snappy first paint, more scroll-fetch hops for big result sets.
 *   - 200 (default): current behavior — fits the common ~hundreds-of-rows case.
 *   - 500/1000: fewer round trips and more rows selectable at once, but bigger
 *     payload + render cost and a longer keyset scan on the RPC side.
 * Persisted to localStorage so the choice survives a refresh.
 */
export const ADMIN_EVENTS_PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000] as const
export type AdminEventsPageSize = (typeof ADMIN_EVENTS_PAGE_SIZE_OPTIONS)[number]
export const ADMIN_EVENTS_PAGE_SIZE_STORAGE_KEY = "admin-events-page-size"
