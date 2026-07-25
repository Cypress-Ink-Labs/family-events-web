import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const readmePath = path.join(repoRoot, "README.md")
const devDocPath = path.join(repoRoot, "docs", "DEVELOPMENT.md")
const reconciledDocPaths = [
  path.join(repoRoot, "apps", "web", "knowledge.md"),
  path.join(repoRoot, "apps", "web", "AGENTS.md"),
  path.join(repoRoot, "CLAUDE.md"),
  path.join(repoRoot, "docs", "DESIGN.md"),
  path.join(repoRoot, "packages", "design-system", "README.md"),
]

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

test("reconciled docs do not reference the retired package scope", () => {
  for (const filePath of reconciledDocPaths) {
    assert.doesNotMatch(read(filePath), /@family-events\//, filePath)
  }
})
