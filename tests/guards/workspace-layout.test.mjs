import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const rootPkgPath = path.join(repoRoot, "package.json")
const webPkgPath = path.join(repoRoot, "apps", "web", "package.json")
const wsPath = path.join(repoRoot, "pnpm-workspace.yaml")
const turboPath = path.join(repoRoot, "turbo.json")
const gitignorePath = path.join(repoRoot, ".gitignore")
const webTsAppPath = path.join(repoRoot, "apps", "web", "tsconfig.app.json")
const webTsNodePath = path.join(repoRoot, "apps", "web", "tsconfig.node.json")
const webAgentsPath = path.join(repoRoot, "apps", "web", "AGENTS.md")

test("workspace root files exist", () => {
  assert.equal(existsSync(rootPkgPath), true)
  assert.equal(existsSync(webPkgPath), true)
  assert.equal(existsSync(wsPath), true)
  assert.equal(existsSync(turboPath), true)
  assert.equal(existsSync(gitignorePath), true)
})

test("workspace configuration includes web app and shared packages", () => {
  const ws = readFileSync(wsPath, "utf8")
  assert.match(ws, /apps\/\*/)
  assert.match(ws, /packages\/\*/)
})

test("web workspace wires explicit package dependencies", () => {
  const webPkg = JSON.parse(readFileSync(webPkgPath, "utf8"))
  assert.equal(webPkg.name, "@cypress-ink-labs/web")
  assert.equal(webPkg.dependencies["@cypress-ink-labs/shared"], "workspace:*")
  assert.match(webPkg.dependencies["@cypress-ink-labs/contracts"], /^\^?\d+\.\d+\.\d+/)
  assert.equal(webPkg.devDependencies["@cypress-ink-labs/config-typescript"], "workspace:*")
  assert.equal(webPkg.devDependencies["@cypress-ink-labs/design-system"], "workspace:*")
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

test("web ownership docs match this package namespace", () => {
  assert.equal(existsSync(webAgentsPath), true)
  const web = readFileSync(webAgentsPath, "utf8")

  assert.match(web, /pnpm --filter @cypress-ink-labs\/web check/)
  assert.match(web, /docs\/DESIGN\.md/)
  assert.match(web, /@cypress-ink-labs\/contracts/)
  assert.match(web, /@cypress-ink-labs\/shared/)
  assert.match(web, /@cypress-ink-labs\/design-system/)
})
