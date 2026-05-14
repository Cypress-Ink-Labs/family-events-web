import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const pkgPath = path.join(repoRoot, "packages", "config-typescript", "package.json")
const basePath = path.join(repoRoot, "packages", "config-typescript", "base.json")
const reactPath = path.join(repoRoot, "packages", "config-typescript", "react-vite.json")
const nodePath = path.join(repoRoot, "packages", "config-typescript", "node.json")

test("config-typescript package files exist", () => {
  assert.equal(existsSync(pkgPath), true)
  assert.equal(existsSync(basePath), true)
  assert.equal(existsSync(reactPath), true)
  assert.equal(existsSync(nodePath), true)
})

test("config-typescript package exports named tsconfig presets", () => {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  assert.equal(pkg.name, "@family-events/config-typescript")
  assert.equal(pkg.private, true)
  assert.equal(pkg.exports["./base.json"], "./base.json")
  assert.equal(pkg.exports["./react-vite.json"], "./react-vite.json")
  assert.equal(pkg.exports["./node.json"], "./node.json")
})
