import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const distDir = path.join(repoRoot, "apps", "web", "dist")
const indexPath = path.join(distDir, "index.html")

// Heavy single-purpose vendor chunks that must never be preloaded on first
// paint — they are route-specific and only needed when the user navigates
// into the page that uses them. A regression that re-introduces a preload
// for any of these costs hundreds of KB of wasted bytes on first load, so
// fail loudly.
const FORBIDDEN_PRELOAD_PATTERNS = [/\/maplibre-/, /\/recharts-/, /\/sentry-/]

// Preload budget for first paint, summed across every <link rel="modulepreload">
// chunk emitted into apps/web/dist/index.html. Start permissive (1 MB) and
// ratchet down later — see .gsd/spike/eager-preload findings.
const PRELOAD_BUDGET_BYTES = 1_048_576

function collectPreloadedAssets(html) {
  // Match: <link rel="modulepreload" ... href="/assets/<file>.js"...>
  // The order of attributes is not guaranteed across builds, so use a
  // tolerant regex that finds any href ending in .js inside a tag that
  // carries rel="modulepreload".
  const tagRe = /<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi
  const hrefRe = /\bhref=["']([^"']+\.js)["']/i
  const hrefs = []
  for (const tag of html.matchAll(tagRe)) {
    const hrefMatch = tag[0].match(hrefRe)
    if (hrefMatch) hrefs.push(hrefMatch[1])
  }
  return hrefs
}

test("web bundle preload budget — first-paint JS stays under 1 MB", () => {
  if (!existsSync(indexPath)) {
    console.warn(
      `[web-bundle-budget] Skipping: ${path.relative(repoRoot, indexPath)} does not exist. ` +
        `Run \`pnpm --filter @family-events/web build\` before this guard to enforce it.`
    )
    return
  }

  const html = readFileSync(indexPath, "utf8")
  const hrefs = collectPreloadedAssets(html)
  assert.ok(hrefs.length > 0, "expected at least one <link rel=\"modulepreload\"> in index.html")

  let total = 0
  const missing = []
  for (const href of hrefs) {
    // hrefs come back as "/assets/<file>.js" — resolve against dist/.
    const rel = href.startsWith("/") ? href.slice(1) : href
    const filePath = path.join(distDir, rel)
    if (!existsSync(filePath)) {
      missing.push(rel)
      continue
    }
    total += statSync(filePath).size
  }

  assert.equal(missing.length, 0, `preloaded assets missing on disk: ${missing.join(", ")}`)
  assert.ok(
    total <= PRELOAD_BUDGET_BYTES,
    `Preload budget exceeded: ${total} bytes (${(total / 1024).toFixed(1)} KB) > ` +
      `${PRELOAD_BUDGET_BYTES} bytes (${(PRELOAD_BUDGET_BYTES / 1024).toFixed(1)} KB). ` +
      `Files preloaded:\n  ` +
      hrefs.join("\n  ")
  )
})

test("web bundle preload — heavy route-specific vendors are not preloaded", () => {
  if (!existsSync(indexPath)) {
    console.warn(
      `[web-bundle-budget] Skipping forbidden-vendor check: ${path.relative(
        repoRoot,
        indexPath
      )} does not exist.`
    )
    return
  }

  const html = readFileSync(indexPath, "utf8")
  const hrefs = collectPreloadedAssets(html)

  const offenders = hrefs.filter((href) =>
    FORBIDDEN_PRELOAD_PATTERNS.some((re) => re.test(href))
  )
  assert.deepEqual(
    offenders,
    [],
    `Route-specific vendor chunks must not be in <link rel="modulepreload"> on first paint. ` +
      `Found: ${offenders.join(", ")}. These chunks are only needed when the user navigates to ` +
      `the page that uses them; preloading them on first paint costs ~1+ MB for nothing. ` +
      `If you intentionally re-introduced this, update FORBIDDEN_PRELOAD_PATTERNS in this test.`
  )
})
