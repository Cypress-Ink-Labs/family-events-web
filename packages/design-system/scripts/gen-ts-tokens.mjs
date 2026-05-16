import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { PKG_ROOT, TS_BANNER, loadTokens } from "./_lib.mjs"

const OUTPUT = path.join(PKG_ROOT, "src", "generated", "tokens.ts")

export function buildTs(tokens) {
  return `${TS_BANNER}

import type { DesignTokens } from "../types.js"

export const designTokens = ${JSON.stringify(tokens, null, 2)} as const satisfies DesignTokens

export type GeneratedTokens = typeof designTokens
`
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
