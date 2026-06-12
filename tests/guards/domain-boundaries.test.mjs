import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const rfcPath = path.join(repoRoot, "docs", "rfcs", "2026-06-11-web-package-boundaries.md")

const ignoredDirs = new Set([
  ".gradle",
  ".idea",
  ".build",
  ".kotlin",
  ".turbo",
  ".xcode",
  "build",
  "DerivedData",
  "node_modules",
])

function read(filePath) {
  return readFileSync(filePath, "utf8")
}

function walk(dir, extensions) {
  if (!existsSync(dir)) {
    return []
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return ignoredDirs.has(entry.name) ? [] : walk(entryPath, extensions)
    }
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [entryPath] : []
  })
}

function relative(filePath) {
  return path.relative(repoRoot, filePath)
}

function assertNoMatchInFiles(files, forbidden, message) {
  for (const filePath of files) {
    const source = read(filePath)
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${relative(filePath)} ${message}: ${pattern}`)
    }
  }
}

test("architecture RFC documents web package boundaries", () => {
  assert.equal(existsSync(rfcPath), true)
  const source = read(rfcPath)

  for (const required of [
    "TypeScript Packages",
    "Web",
    "External Contracts Package",
    "Design Tokens",
    "tests/guards/domain-boundaries.test.mjs",
  ]) {
    assert.match(source, new RegExp(required.replaceAll("/", "\\/")))
  }
})

test("shared package remains platform neutral", () => {
  const sharedFiles = walk(path.join(repoRoot, "packages", "shared", "src"), [".ts", ".tsx"])
  const platformImports = [
    /from ["']@\/[^"']+["']/,
    /from ["']react(?:["'/-])/,
    /from ["']@supabase\//,
    /from ["'](?:apps|@\/components|@\/features)\//,
    /from ["'](?:lucide-react|framer-motion|maplibre-gl)["']/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
  ]

  assertNoMatchInFiles(sharedFiles, [...platformImports, /from ["']@cypress-ink-labs\/contracts/], "must stay pure")

  const sharedPkg = JSON.parse(read(path.join(repoRoot, "packages", "shared", "package.json")))
  assert.equal(sharedPkg.dependencies?.["@cypress-ink-labs/contracts"], undefined)
})

test("web runtime Supabase SDK imports stay behind the web adapter", () => {
  const webFiles = walk(path.join(repoRoot, "apps", "web", "src"), [".ts", ".tsx"])
  const allowedRuntimeImport = path.join(
    repoRoot,
    "apps",
    "web",
    "src",
    "infrastructure",
    "supabase",
    "client.ts",
  )
  const runtimeSupabaseImport = /^\s*import\s+(?!type\b)[^\n]*from ["']@supabase\/supabase-js["']/m

  for (const filePath of webFiles) {
    if (filePath === allowedRuntimeImport) {
      continue
    }
    assert.doesNotMatch(
      read(filePath),
      runtimeSupabaseImport,
      `${relative(filePath)} must consume web lib adapters instead of runtime Supabase SDK imports`,
    )
  }
})
