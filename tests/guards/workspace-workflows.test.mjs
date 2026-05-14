import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const ciPath = path.join(repoRoot, ".github", "workflows", "ci.yml")
const rwxCiPath = path.join(repoRoot, ".rwx", "ci.yml")
const depReviewPath = path.join(repoRoot, ".github", "workflows", "dependency-review.yml")
const localScriptPath = path.join(repoRoot, "scripts", "check-monorepo.sh")
const rootPackagePath = path.join(repoRoot, "package.json")

test("ci workflow includes repeatable guard/check/test/build commands", () => {
  const ci = readFileSync(ciPath, "utf8")
  // RWX owns most tasks; check combined coverage across both CI configs
  const rwxCi = existsSync(rwxCiPath) ? readFileSync(rwxCiPath, "utf8") : ""
  const combined = ci + "\n" + rwxCi
  assert.match(combined, /pnpm install --frozen-lockfile/)
  assert.match(combined, /pnpm(?:\s+run)?\s+docs:test/)
  assert.match(combined, /pnpm(?:\s+run)?\s+workspace:test/)
  // RWX runs typecheck + lint + format individually instead of `pnpm run check`
  assert.match(combined, /typecheck|pnpm run check/)
  // RWX runs captain or vitest directly instead of `pnpm run test`
  assert.match(combined, /vitest|captain|pnpm run test/)
  assert.match(combined, /build/)
  assert.match(combined, /xcodegen generate/)
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

test("workspace exposes turbo-backed formatting scripts", () => {
  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8"))
  assert.equal(pkg.scripts.format, "turbo run format")
  assert.equal(pkg.scripts["format:check"], "turbo run format:check")
})
