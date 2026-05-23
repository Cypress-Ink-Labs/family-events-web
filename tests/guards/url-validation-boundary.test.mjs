import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..")
const sharedPath = path.join(repoRoot, "packages", "shared", "src", "url-validation.ts")
const edgePath = path.join(repoRoot, "supabase", "functions", "_shared", "url-validation.ts")

test("edge URL validator mirrors the shared package implementation", () => {
  assert.equal(readFileSync(edgePath, "utf8"), readFileSync(sharedPath, "utf8"))
})
