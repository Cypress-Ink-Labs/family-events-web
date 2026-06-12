import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const ciPath = path.join(repoRoot, ".github", "workflows", "ci.yml")
const depReviewPath = path.join(repoRoot, ".github", "workflows", "dependency-review.yml")
const localScriptPath = path.join(repoRoot, "scripts", "check-monorepo.sh")
const rootPackagePath = path.join(repoRoot, "package.json")
const turboPath = path.join(repoRoot, "turbo.json")

test("ci workflow includes repeatable guard/check/test/build commands", () => {
  const ci = readFileSync(ciPath, "utf8")
  assert.match(ci, /pnpm install --frozen-lockfile/)
  assert.match(ci, /pnpm(?:\s+run)?\s+docs:test/)
  assert.match(ci, /pnpm(?:\s+run)?\s+workspace:test/)
  assert.match(ci, /pnpm run check/)
  assert.match(ci, /pnpm run test/)
  assert.match(ci, /pnpm run build/)
})

test("dependency-review watches all workspace manifests", () => {
  const dep = readFileSync(depReviewPath, "utf8")
  assert.match(dep, /apps\/\*\*\/package\.json/)
  assert.match(dep, /packages\/\*\*\/package\.json/)
  assert.match(dep, /pnpm-lock\.yaml/)
})

test("local repeatable workflow script exists and delegates to the full scoped gate", () => {
  assert.equal(existsSync(localScriptPath), true)
  const script = readFileSync(localScriptPath, "utf8")
  assert.match(script, /pnpm run verify:full/)
})

test("turbo scripts avoid deprecated parallel flag", () => {
  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8"))
  for (const [scriptName, script] of Object.entries(pkg.scripts)) {
    assert.doesNotMatch(script, /--parallel\b/, `${scriptName} uses deprecated --parallel`)
  }
})

test("workspace exposes turbo-backed formatting and verification scripts", () => {
  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8"))
  assert.equal(pkg.scripts.format, "turbo run format")
  assert.equal(pkg.scripts["format:check"], "turbo run format:check")
  assert.equal(pkg.scripts["web:check"], "pnpm --filter @cypress-ink-labs/web check")
  assert.equal(pkg.scripts["web:test"], "pnpm --filter @cypress-ink-labs/web test")
  assert.equal(pkg.scripts["web:build"], "pnpm --filter @cypress-ink-labs/web build")
  assert.match(pkg.scripts["packages:check"], /@cypress-ink-labs\/shared check/)
  assert.match(pkg.scripts["packages:check"], /@cypress-ink-labs\/design-system check/)
  assert.match(pkg.scripts["packages:test"], /@cypress-ink-labs\/shared test/)
  assert.match(pkg.scripts["packages:test"], /@cypress-ink-labs\/design-system test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run docs:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run workspace:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run packages:check/)
  assert.match(pkg.scripts["verify:web"], /pnpm run packages:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:check/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:build/)
  assert.equal(pkg.scripts["verify:full"], "pnpm run verify:web")
  assert.equal(pkg.scripts["clean:artifacts"], "bash scripts/clean-generated-artifacts.sh")
})

test("artifact cleanup script exists and avoids dependency/source deletion", () => {
  const cleanupPath = path.join(repoRoot, "scripts", "clean-generated-artifacts.sh")
  assert.equal(existsSync(cleanupPath), true)

  const script = readFileSync(cleanupPath, "utf8")
  assert.match(script, /apps\/web\/dist/)
  assert.match(script, /apps\/web\/output/)
  assert.doesNotMatch(script, /node_modules/)
  assert.doesNotMatch(script, /tokens\.generated\.css/)
  assert.doesNotMatch(script, /Tokens\.swift/)
  assert.doesNotMatch(script, /Tokens\.kt/)
})

test("generated artifact directories are ignored explicitly", () => {
  const gitignorePath = path.join(repoRoot, ".gitignore")
  const gitignore = readFileSync(gitignorePath, "utf8")

  for (const pattern of ["**/.turbo/", "**/build/", "apps/web/output/", "apps/web/dist/"]) {
    assert.match(gitignore, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  assert.match(gitignore, /!packages\/design-system\/dist\//)
})

test("turbo declares measurable build outputs for web and design-system", () => {
  const turbo = JSON.parse(readFileSync(turboPath, "utf8"))
  assert.deepEqual(turbo.tasks.build.dependsOn, ["^build"])
  assert.match(turbo.tasks.build.outputs.join("\n"), /^dist\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^build\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^out\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^\.next\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^!\.next\/cache\/\*\*$/m)

  assert.deepEqual(turbo.tasks["@cypress-ink-labs/web#build"].dependsOn, ["^build"])
  assert.match(
    turbo.tasks["@cypress-ink-labs/web#build"].outputs.join("\n"),
    /^\.\.\/\.\.\/node_modules\/\.tmp\/apps-web\*\.tsbuildinfo$/m
  )

  const designOutputs = turbo.tasks["@cypress-ink-labs/design-system#build"].outputs.join("\n")
  assert.match(designOutputs, /^src\/generated\/\*\*$/m)
  assert.match(designOutputs, /^dist\/\*\*$/m)
  assert.match(designOutputs, /apps\/web\/src\/styles\/tokens\.generated\.css/)
})

test("ci wires optional Turbo cache environment and local cache restore", () => {
  const ci = readFileSync(ciPath, "utf8")
  assert.match(ci, /TURBO_TOKEN: \$\{\{ secrets\.TURBO_TOKEN \}\}/)
  assert.match(ci, /TURBO_TEAM: \$\{\{ vars\.TURBO_TEAM \|\| secrets\.TURBO_TEAM \}\}/)
  assert.match(ci, /TURBO_TEAMID: \$\{\{ vars\.TURBO_TEAMID \|\| secrets\.TURBO_TEAMID \}\}/)
  assert.match(ci, /actions\/cache@v5/)
  assert.match(ci, /packages\/\*\/\.turbo/)
})
