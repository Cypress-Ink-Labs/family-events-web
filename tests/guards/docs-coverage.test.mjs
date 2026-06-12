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

test("README documents required web workspace domains", () => {
  const readme = read(readmePath)
  assert.match(readme, /^## Web Workspace$/m)
  assert.match(readme, /^## Shared Package$/m)
  assert.match(readme, /^## Design System Package$/m)
  assert.match(readme, /^## Workflows$/m)
})

test("docs/DEVELOPMENT.md documents setup and workflow commands by domain", () => {
  const devDoc = read(devDocPath)
  assert.match(devDoc, /^## Web \(apps\/web\)$/m)
  assert.match(devDoc, /^## Shared Packages \(packages\)$/m)
  assert.match(devDoc, /^## Design Tokens$/m)
  assert.match(devDoc, /^## CI and Local Verification Workflows$/m)
})
