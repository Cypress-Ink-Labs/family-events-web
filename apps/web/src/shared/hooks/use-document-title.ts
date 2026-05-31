import { useEffect } from "react"

const SUFFIX = "Family Events"

/**
 * Sets `document.title` to `"{title} | Family Events"`.
 *
 * Reverts to the bare suffix on unmount so stale titles never linger
 * after navigation.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${SUFFIX}`
    } else {
      document.title = SUFFIX
    }

    return () => {
      document.title = SUFFIX
    }
  }, [title])
}
