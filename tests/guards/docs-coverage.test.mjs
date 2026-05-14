import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const readmePath = path.join(repoRoot, "README.md")
const devDocPath = path.join(repoRoot, "docs", "DEVELOPMENT.md")

function read(filePath) {
  return readFileSync(filePath, "utf8")
}

test("README documents all required monorepo domains", () => {
  const readme = read(readmePath)
  assert.match(readme, /^## Web Workspace$/m)
  assert.match(readme, /^## iOS Workspace$/m)
  assert.match(readme, /^## Shared Package$/m)
  assert.match(readme, /^## Contracts Package$/m)
  assert.match(readme, /^## Supabase$/m)
  assert.match(readme, /^## Workflows$/m)
})

test("docs/DEVELOPMENT.md documents setup and workflow commands by domain", () => {
  const devDoc = read(devDocPath)
  assert.match(devDoc, /^## Web \(apps\/web\)$/m)
  assert.match(devDoc, /^## iOS \(apps\/ios\)$/m)
  assert.match(devDoc, /^## Shared \+ Contracts \(packages\)$/m)
  assert.match(devDoc, /^## Supabase \(root\/supabase\)$/m)
  assert.match(devDoc, /^## CI and Local Verification Workflows$/m)
})
