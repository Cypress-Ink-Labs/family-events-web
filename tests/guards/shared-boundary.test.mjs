import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const sharedSrc = path.join(repoRoot, "packages", "shared", "src")
const forbiddenImports = [
  /from "react"/,
  /from "react-/,
  /from "@\/components/,
  /from "@radix-ui\//,
  /from "maplibre/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
]

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(entryPath)
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [entryPath] : []
  })
}

test("shared package stays platform neutral", () => {
  for (const filePath of sourceFiles(sharedSrc)) {
    assert.equal(filePath.endsWith(".tsx"), false, `${filePath} must not contain UI components`)

    const source = readFileSync(filePath, "utf8")
    for (const forbidden of forbiddenImports) {
      assert.doesNotMatch(source, forbidden, `${filePath} uses platform-specific code`)
    }
  }
})
