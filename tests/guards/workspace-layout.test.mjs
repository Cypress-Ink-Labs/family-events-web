import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const rootPkgPath = path.join(repoRoot, "package.json")
const webPkgPath = path.join(repoRoot, "apps", "web", "package.json")
const androidPkgPath = path.join(repoRoot, "apps", "android", "package.json")
const wsPath = path.join(repoRoot, "pnpm-workspace.yaml")
const turboPath = path.join(repoRoot, "turbo.json")
const gitignorePath = path.join(repoRoot, ".gitignore")
const webTsAppPath = path.join(repoRoot, "apps", "web", "tsconfig.app.json")
const webTsNodePath = path.join(repoRoot, "apps", "web", "tsconfig.node.json")
const webAgentsPath = path.join(repoRoot, "apps", "web", "AGENTS.md")
const iosAgentsPath = path.join(repoRoot, "apps", "ios", "AGENTS.md")
const androidAgentsPath = path.join(repoRoot, "apps", "android", "AGENTS.md")

test("workspace root files exist", () => {
  assert.equal(existsSync(rootPkgPath), true)
  assert.equal(existsSync(webPkgPath), true)
  assert.equal(existsSync(androidPkgPath), true)
  assert.equal(existsSync(wsPath), true)
  assert.equal(existsSync(turboPath), true)
  assert.equal(existsSync(gitignorePath), true)
})

test("android workspace exposes Gradle-backed package scripts", () => {
  const androidPkg = JSON.parse(readFileSync(androidPkgPath, "utf8"))
  assert.equal(androidPkg.name, "@cypress-ink-labs/android")
  assert.match(androidPkg.scripts.check, /\.\/gradlew check/)
  assert.match(androidPkg.scripts.test, /\.\/gradlew test/)
  assert.match(androidPkg.scripts.build, /\.\/gradlew assembleDebug/)
  assert.match(androidPkg.scripts.lint, /\.\/gradlew lint/)
})

test("workspace configuration includes apps, packages, supabase/functions", () => {
  const ws = readFileSync(wsPath, "utf8")
  assert.match(ws, /apps\/\*/)
  assert.match(ws, /packages\/\*/)
  assert.match(ws, /supabase\/functions/)
})

test("web workspace wires explicit workspace dependencies", () => {
  const webPkg = JSON.parse(readFileSync(webPkgPath, "utf8"))
  assert.equal(webPkg.name, "@cypress-ink-labs/web")
  assert.equal(webPkg.dependencies["@cypress-ink-labs/shared"], "workspace:*")
  assert.equal(webPkg.dependencies["@cypress-ink-labs/contracts"], "workspace:*")
  assert.equal(webPkg.devDependencies["@cypress-ink-labs/config-typescript"], "workspace:*")
  assert.equal(webPkg.devDependencies["@cypress-ink-labs/config-quality"], undefined)
})

test("web tsconfig consumers extend config-typescript presets", () => {
  const appCfg = JSON.parse(readFileSync(webTsAppPath, "utf8"))
  const nodeCfg = JSON.parse(readFileSync(webTsNodePath, "utf8"))
  assert.equal(appCfg.extends, "@cypress-ink-labs/config-typescript/react-vite.json")
  assert.equal(nodeCfg.extends, "@cypress-ink-labs/config-typescript/node.json")
})

test("turbo cache directory is ignored", () => {
  const gitignore = readFileSync(gitignorePath, "utf8")
  assert.match(gitignore, /^\.turbo$/m)
})

test("app ownership docs exist for web, iOS, and Android", () => {
  assert.equal(existsSync(webAgentsPath), true)
  assert.equal(existsSync(iosAgentsPath), true)
  assert.equal(existsSync(androidAgentsPath), true)

  const web = readFileSync(webAgentsPath, "utf8")
  const ios = readFileSync(iosAgentsPath, "utf8")
  const android = readFileSync(androidAgentsPath, "utf8")

  assert.match(web, /pnpm --filter @cypress-ink-labs\/web check/)
  assert.match(web, /docs\/DESIGN\.md/)
  assert.match(web, /@cypress-ink-labs\/contracts/)
  assert.match(web, /@cypress-ink-labs\/shared/)
  assert.match(web, /@cypress-ink-labs\/design-system/)

  assert.match(ios, /pnpm run ios:test/)
  assert.match(ios, /XcodeGen/)
  assert.match(ios, /consumer/i)
  assert.match(ios, /FECore/)
  assert.match(ios, /FEData/)
  assert.match(ios, /FEDesignSystem/)

  assert.match(android, /pnpm --filter @cypress-ink-labs\/android check/)
  assert.match(android, /consumer/i)
  assert.match(android, /:core/)
  assert.match(android, /:data/)
  assert.match(android, /:designsystem/)
})
