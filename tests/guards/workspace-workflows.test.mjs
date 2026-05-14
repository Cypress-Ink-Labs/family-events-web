import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const ciPath = path.join(repoRoot, ".github", "workflows", "ci.yml")
const depReviewPath = path.join(repoRoot, ".github", "workflows", "dependency-review.yml")
const localScriptPath = path.join(repoRoot, "scripts", "check-monorepo.sh")
const rootPackagePath = path.join(repoRoot, "package.json")

test("ci workflow includes repeatable guard/check/test/build commands", () => {
  const ci = readFileSync(ciPath, "utf8")
  assert.match(ci, /pnpm install --frozen-lockfile/)
  assert.match(ci, /pnpm run docs:test/)
  assert.match(ci, /pnpm run workspace:test/)
  assert.match(ci, /pnpm run check/)
  assert.match(ci, /pnpm run test/)
  assert.match(ci, /pnpm run build/)
  assert.match(ci, /xcodegen generate/)
})

test("dependency-review watches all workspace manifests", () => {
  const dep = readFileSync(depReviewPath, "utf8")
  assert.match(dep, /apps\/\*\*\/package\.json/)
  assert.match(dep, /packages\/\*\*\/package\.json/)
  assert.match(dep, /pnpm-lock\.yaml/)
})

test("local repeatable workflow script exists and runs the same gate sequence", () => {
  assert.equal(existsSync(localScriptPath), true)
  const script = readFileSync(localScriptPath, "utf8")
  assert.match(script, /pnpm run docs:test/)
  assert.match(script, /pnpm run workspace:test/)
  assert.match(script, /pnpm run check/)
  assert.match(script, /pnpm run test/)
  assert.match(script, /pnpm run build/)
})

test("turbo scripts avoid deprecated parallel flag", () => {
  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8"))
  for (const [scriptName, script] of Object.entries(pkg.scripts)) {
    assert.doesNotMatch(script, /--parallel\b/, `${scriptName} uses deprecated --parallel`)
  }
})
