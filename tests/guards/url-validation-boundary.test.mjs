import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const webSourcesPath = path.join(repoRoot, "apps", "web", "src", "features", "admin", "api", "sources.ts")
const sharedIndexPath = path.join(repoRoot, "packages", "shared", "src", "index.ts")
const sharedValidatorPath = path.join(repoRoot, "packages", "shared", "src", "url-validation.ts")

test("web source URL validation uses the shared package boundary", () => {
  assert.match(readFileSync(webSourcesPath, "utf8"), /validateExternalUrl.*from "@cypress-ink-labs\/shared"/)
  assert.match(readFileSync(sharedIndexPath, "utf8"), /validateExternalUrl.*\.\/url-validation/)
  assert.match(readFileSync(sharedValidatorPath, "utf8"), /export function validateExternalUrl/)
})
