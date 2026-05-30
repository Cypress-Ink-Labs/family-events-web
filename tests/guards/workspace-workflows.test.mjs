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
const turboPath = path.join(repoRoot, "turbo.json")

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
  assert.match(combined, /android|gradle|setup-java/i)
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

test("workspace exposes turbo-backed formatting scripts", () => {
  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8"))
  assert.equal(pkg.scripts.format, "turbo run format")
  assert.equal(pkg.scripts["format:check"], "turbo run format:check")
  assert.equal(pkg.scripts["web:check"], "pnpm --filter @family-events/web check")
  assert.equal(pkg.scripts["web:test"], "pnpm --filter @family-events/web test")
  assert.equal(pkg.scripts["web:build"], "pnpm --filter @family-events/web build")
  assert.match(pkg.scripts["packages:check"], /@family-events\/contracts check/)
  assert.match(pkg.scripts["packages:check"], /@family-events\/shared check/)
  assert.match(pkg.scripts["packages:check"], /@family-events\/design-system check/)
  assert.match(pkg.scripts["packages:check"], /@family-events\/email check/)
  assert.match(pkg.scripts["packages:test"], /@family-events\/contracts test/)
  assert.match(pkg.scripts["packages:test"], /@family-events\/shared test/)
  assert.match(pkg.scripts["packages:test"], /@family-events\/design-system test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run docs:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run workspace:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:check/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:test/)
  assert.match(pkg.scripts["verify:web"], /pnpm run web:build/)
  assert.equal(pkg.scripts["verify:ios"], "pnpm run ios:test")
  assert.equal(pkg.scripts["android:check"], "pnpm --filter @family-events/android check")
  assert.equal(pkg.scripts["android:test"], "pnpm --filter @family-events/android test")
  assert.equal(pkg.scripts["android:build"], "pnpm --filter @family-events/android build")
  assert.match(
    pkg.scripts["verify:android"],
    /^bash -c 'pnpm run android:check && pnpm run android:test && pnpm run android:build'$/
  )
  assert.match(
    pkg.scripts["verify:full"],
    /^bash -c 'pnpm run verify:web && pnpm run verify:ios && pnpm run verify:android'$/
  )
  assert.equal(pkg.scripts["clean:artifacts"], "bash scripts/clean-generated-artifacts.sh")
})

test("artifact cleanup script exists and avoids dependency/source deletion", () => {
  const cleanupPath = path.join(repoRoot, "scripts", "clean-generated-artifacts.sh")
  assert.equal(existsSync(cleanupPath), true)

  const script = readFileSync(cleanupPath, "utf8")
  assert.match(script, /apps\/web\/dist/)
  assert.match(script, /apps\/web\/output/)
  assert.match(script, /apps\/android\/\.gradle/)
  assert.match(script, /apps\/android\/\*\/build/)
  assert.match(script, /apps\/ios\/Packages\/\*\/\.build/)
  assert.doesNotMatch(script, /node_modules/)
  assert.doesNotMatch(script, /FamilyEvents\.xcodeproj/)
  assert.doesNotMatch(script, /tokens\.generated\.css/)
  assert.doesNotMatch(script, /Tokens\.swift/)
  assert.doesNotMatch(script, /Tokens\.kt/)
})

test("generated artifact directories are ignored explicitly", () => {
  const gitignorePath = path.join(repoRoot, ".gitignore")
  const gitignore = readFileSync(gitignorePath, "utf8")

  for (const pattern of [
    "**/.turbo/",
    "**/build/",
    "**/.gradle/",
    "**/.kotlin/",
    "**/.build/",
    "**/.swiftpm/",
    "DerivedData/",
    "apps/web/output/",
    "apps/web/dist/",
  ]) {
    assert.match(gitignore, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("turbo declares measurable build outputs for web, design-system, and android", () => {
  const turbo = JSON.parse(readFileSync(turboPath, "utf8"))
  assert.deepEqual(turbo.tasks.build.dependsOn, ["^build"])
  assert.match(turbo.tasks.build.outputs.join("\n"), /^dist\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^build\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^out\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^\.next\/\*\*$/m)
  assert.match(turbo.tasks.build.outputs.join("\n"), /^!\.next\/cache\/\*\*$/m)

  assert.deepEqual(turbo.tasks["@family-events/web#build"].dependsOn, ["^build"])
  assert.match(
    turbo.tasks["@family-events/web#build"].outputs.join("\n"),
    /^\.\.\/\.\.\/node_modules\/\.tmp\/apps-web\*\.tsbuildinfo$/m
  )

  const designOutputs = turbo.tasks["@family-events/design-system#build"].outputs.join("\n")
  assert.match(designOutputs, /^src\/generated\/\*\*$/m)
  assert.match(designOutputs, /apps\/web\/src\/styles\/tokens\.generated\.css/)
  assert.match(designOutputs, /apps\/ios\/Packages\/FEDesignSystem\/Sources\/FEDesignSystem\/Generated\/Tokens\.swift/)
  assert.match(designOutputs, /apps\/android\/designsystem\/src\/main\/java\/com\/familyevents\/designsystem\/generated\/Tokens\.kt/)

  const androidOutputs = turbo.tasks["@family-events/android#build"].outputs.join("\n")
  assert.match(androidOutputs, /^\*\/build\/outputs\/\*\*$/m)
  assert.match(androidOutputs, /^\*\/build\/reports\/\*\*$/m)
  assert.match(androidOutputs, /^\*\/build\/test-results\/\*\*$/m)
})

test("ci wires optional Turbo remote cache proof and uploads cache evidence", () => {
  const ci = readFileSync(ciPath, "utf8")
  assert.match(ci, /TURBO_TOKEN: \$\{\{ secrets\.TURBO_TOKEN \}\}/)
  assert.match(ci, /TURBO_TEAM: \$\{\{ vars\.TURBO_TEAM \|\| secrets\.TURBO_TEAM \}\}/)
  assert.match(ci, /TURBO_TEAMID: \$\{\{ vars\.TURBO_TEAMID \|\| secrets\.TURBO_TEAMID \}\}/)
  assert.match(ci, /remote cache skipped: TURBO_TOKEN plus TURBO_TEAM\/TURBO_TEAMID not available/)
  assert.match(ci, /pnpm exec turbo run check build --filter=@family-events\/web --summarize/)
  assert.match(ci, /pnpm exec turbo run build --filter=@family-events\/web --summarize/)
  assert.match(ci, /remote cache proof failed for @family-events\/web#build/)
  assert.match(ci, /turbo-cache-report\.md/)
  assert.match(ci, /name: turbo-cache-proof/)
})
