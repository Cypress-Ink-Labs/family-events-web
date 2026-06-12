import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const sharedPkgPath = path.join(repoRoot, "packages", "shared", "package.json")
const webContractsConsumerPath = path.join(repoRoot, "apps", "web", "src", "shared", "types.ts")
const webSharedConsumerPath = path.join(repoRoot, "apps", "web", "src", "features", "admin", "api", "sources.ts")

test("shared package manifest exists", () => {
  assert.equal(existsSync(sharedPkgPath), true)
})

test("web workspace has source-level imports for shared and contracts", () => {
  assert.equal(existsSync(webContractsConsumerPath), true)
  assert.equal(existsSync(webSharedConsumerPath), true)
  const contractsConsumer = readFileSync(webContractsConsumerPath, "utf8")
  const sharedConsumer = readFileSync(webSharedConsumerPath, "utf8")
  assert.match(contractsConsumer, /from "@cypress-ink-labs\/contracts"/)
  assert.match(sharedConsumer, /from "@cypress-ink-labs\/shared"/)
})
