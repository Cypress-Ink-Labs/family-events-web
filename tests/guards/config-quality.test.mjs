import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const pkgPath = path.join(repoRoot, "packages", "config-quality", "package.json")
const lintPath = path.join(repoRoot, "packages", "config-quality", "oxlint.base.json")
const fmtPath = path.join(repoRoot, "packages", "config-quality", "oxfmt.base.json")

test("config-quality package files exist", () => {
  assert.equal(existsSync(pkgPath), true)
  assert.equal(existsSync(lintPath), true)
  assert.equal(existsSync(fmtPath), true)
})

test("config-quality package exports lint/format presets", () => {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  assert.equal(pkg.name, "@family-events/config-quality")
  assert.equal(pkg.exports["./oxlint.base.json"], "./oxlint.base.json")
  assert.equal(pkg.exports["./oxfmt.base.json"], "./oxfmt.base.json")
})
