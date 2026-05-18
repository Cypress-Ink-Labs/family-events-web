import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const rfcPath = path.join(repoRoot, "docs", "rfcs", "2026-05-17-cross-platform-domain-boundaries.md")

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

test("architecture RFC documents boundaries and anti-corruption contracts", () => {
  assert.equal(existsSync(rfcPath), true)
  const source = read(rfcPath)

  for (const required of [
    "TypeScript Packages",
    "Web",
    "iOS",
    "Android",
    "Anti-Corruption Contracts",
    "tests/guards/domain-boundaries.test.mjs",
  ]) {
    assert.match(source, new RegExp(required.replaceAll("/", "\\/")))
  }
})

test("shared and contracts packages remain platform neutral", () => {
  const sharedFiles = walk(path.join(repoRoot, "packages", "shared", "src"), [".ts", ".tsx"])
  const contractFiles = walk(path.join(repoRoot, "packages", "contracts", "src"), [".ts", ".tsx"])
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

  assertNoMatchInFiles(sharedFiles, [...platformImports, /from ["']@family-events\/contracts/], "must stay pure")
  assertNoMatchInFiles(contractFiles, [...platformImports, /from ["']@family-events\/shared/], "must stay contract-only")

  const sharedPkg = JSON.parse(read(path.join(repoRoot, "packages", "shared", "package.json")))
  const contractsPkg = JSON.parse(read(path.join(repoRoot, "packages", "contracts", "package.json")))
  assert.equal(sharedPkg.dependencies?.["@family-events/contracts"], undefined)
  assert.equal(contractsPkg.dependencies?.["@family-events/shared"], undefined)
})

test("web runtime Supabase SDK imports stay behind the web adapter", () => {
  const webFiles = walk(path.join(repoRoot, "apps", "web", "src"), [".ts", ".tsx"])
  const allowedRuntimeImport = path.join(repoRoot, "apps", "web", "src", "lib", "supabase.ts")
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

test("iOS platform SDK imports stay in adapter packages", () => {
  const swiftFiles = walk(path.join(repoRoot, "apps", "ios"), [".swift"])
  const supabaseImport = /^\s*import\s+Supabase\b/m
  const coreLocationOrWeatherKitImport = /^\s*import\s+(?:CoreLocation|WeatherKit)\b/m

  for (const filePath of swiftFiles) {
    const rel = relative(filePath)
    const source = read(filePath)
    const inData = rel.startsWith("apps/ios/Packages/FEData/")
    const inAuth = rel.startsWith("apps/ios/Packages/FEAuth/")

    if (!inData && !inAuth) {
      assert.doesNotMatch(source, supabaseImport, `${rel} must not import Supabase directly`)
    }

    if (!inData) {
      assert.doesNotMatch(source, coreLocationOrWeatherKitImport, `${rel} must use FEData service protocols`)
    }
  }
})

test("Android platform SDK imports stay in data/app assembly", () => {
  const kotlinFiles = walk(path.join(repoRoot, "apps", "android"), [".kt"])
  const dataSdkImport = /^\s*import\s+(?:io\.github\.jan\.supabase|io\.ktor)\b/m
  const roomImport = /^\s*import\s+androidx\.room\b/m

  for (const filePath of kotlinFiles) {
    const rel = relative(filePath)
    const source = read(filePath)
    const inData = rel.startsWith("apps/android/data/")
    const inApp = rel.startsWith("apps/android/app/")

    if (!inData) {
      assert.doesNotMatch(source, dataSdkImport, `${rel} must use :data repositories instead of data SDK imports`)
    }

    if (!inData && !inApp) {
      assert.doesNotMatch(source, roomImport, `${rel} must not import Room directly`)
    }
  }
})

test("mobile package manifests keep external data SDK dependencies in adapter modules", () => {
  const iosPackages = walk(path.join(repoRoot, "apps", "ios", "Packages"), ["Package.swift"])
  for (const filePath of iosPackages) {
    const rel = relative(filePath)
    const source = read(filePath)
    const mayDependOnSupabase =
      rel === "apps/ios/Packages/FEData/Package.swift" || rel === "apps/ios/Packages/FEAuth/Package.swift"
    if (!mayDependOnSupabase) {
      assert.doesNotMatch(source, /supabase-swift|product\(name: "(?:Supabase|Auth)"/, `${rel} must not depend on Supabase`)
    }
  }

  const androidGradleFiles = walk(path.join(repoRoot, "apps", "android"), ["build.gradle.kts"])
  for (const filePath of androidGradleFiles) {
    const rel = relative(filePath)
    const source = read(filePath)
    const inData = rel === "apps/android/data/build.gradle.kts"
    const inApp = rel === "apps/android/app/build.gradle.kts"

    if (!inData) {
      assert.doesNotMatch(source, /libs\.(?:supabase|ktor)\b/, `${rel} must not depend on Supabase/Ktor directly`)
    }

    if (!inData && !inApp) {
      assert.doesNotMatch(source, /libs\.androidx\.room\b/, `${rel} must not depend on Room directly`)
    }
  }
})
