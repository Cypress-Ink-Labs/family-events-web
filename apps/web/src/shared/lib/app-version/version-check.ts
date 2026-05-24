export const DYNAMIC_IMPORT_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a (module )?script failed|error loading dynamically imported module/i

export interface VersionManifest {
  version: string
  builtAt: string
}

export interface VersionCheckResult {
  stale: boolean
  remoteVersion: string | null
}

export async function checkForUpdate(
  currentVersion: string,
  fetcher: typeof fetch = fetch
): Promise<VersionCheckResult> {
  try {
    // cache: 'no-store' bypasses HTTP cache for the manifest specifically;
    // serve.json already sets no-store but defends against a stale CDN edge.
    const res = await fetcher("/version.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return { stale: false, remoteVersion: null }
    const data = (await res.json()) as Partial<VersionManifest>
    if (typeof data?.version !== "string" || data.version.length === 0) {
      return { stale: false, remoteVersion: null }
    }
    return {
      stale: data.version !== currentVersion,
      remoteVersion: data.version,
    }
  } catch {
    return { stale: false, remoteVersion: null }
  }
}

export function isDynamicImportError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return DYNAMIC_IMPORT_ERROR_PATTERN.test(message)
}
