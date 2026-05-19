import { mkdirSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { PKG_ROOT, TS_BANNER, loadTokens } from "./_lib.mjs"

const OUTPUT = path.join(PKG_ROOT, "src", "generated", "tokens.ts")
const OXFMT_CONFIG = path.join(PKG_ROOT, "..", "config-quality", "oxfmt.base.json")

function formatTs(source) {
  const result = spawnSync(
    "pnpm",
    ["exec", "oxfmt", "--stdin-filepath", OUTPUT, "--config", OXFMT_CONFIG],
    {
      cwd: PKG_ROOT,
      encoding: "utf8",
      input: source,
    }
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "oxfmt failed")
  }

  return result.stdout
}

export function buildTs(tokens) {
  return formatTs(`${TS_BANNER}

import type { DesignTokens } from "../types.js"

export const designTokens = ${JSON.stringify(tokens, null, 2)} as const satisfies DesignTokens

export type GeneratedTokens = typeof designTokens
`)
}

export function run() {
  const tokens = loadTokens()
  const ts = buildTs(tokens)
  mkdirSync(path.dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, ts, "utf8")
  return OUTPUT
}

export const OUTPUT_PATH = OUTPUT

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = run()
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
}
