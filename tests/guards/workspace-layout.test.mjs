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

test("workspace root files exist", () => {
  assert.equal(existsSync(rootPkgPath), true)
  assert.equal(existsSync(webPkgPath), true)
  assert.equal(existsSync(wsPath), true)
  assert.equal(existsSync(turboPath), true)
  assert.equal(existsSync(gitignorePath), true)
})

test("workspace configuration includes apps, packages, supabase/functions", () => {
  const ws = readFileSync(wsPath, "utf8")
  assert.match(ws, /apps\/\*/)
  assert.match(ws, /packages\/\*/)
  assert.match(ws, /supabase\/functions/)
})

test("web workspace wires explicit workspace dependencies", () => {
  const webPkg = JSON.parse(readFileSync(webPkgPath, "utf8"))
  assert.equal(webPkg.name, "@family-events/web")
  assert.equal(webPkg.dependencies["@family-events/shared"], "workspace:*")
  assert.equal(webPkg.dependencies["@family-events/contracts"], "workspace:*")
  assert.equal(webPkg.devDependencies["@family-events/config-typescript"], "workspace:*")
  assert.equal(webPkg.devDependencies["@family-events/config-quality"], "workspace:*")
})

test("web tsconfig consumers extend config-typescript presets", () => {
  const appCfg = JSON.parse(readFileSync(webTsAppPath, "utf8"))
  const nodeCfg = JSON.parse(readFileSync(webTsNodePath, "utf8"))
  assert.equal(appCfg.extends, "@family-events/config-typescript/react-vite.json")
  assert.equal(nodeCfg.extends, "@family-events/config-typescript/node.json")
})

test("turbo cache directory is ignored", () => {
  const gitignore = readFileSync(gitignorePath, "utf8")
  assert.match(gitignore, /^\.turbo$/m)
})
