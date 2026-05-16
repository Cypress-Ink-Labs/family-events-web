import path from "node:path"
import { run as runWeb, OUTPUT_PATH as WEB_OUT } from "./gen-web-css.mjs"
import { run as runIos, OUTPUT_PATH as IOS_OUT } from "./gen-ios-swift.mjs"
import { run as runTs, OUTPUT_PATH as TS_OUT } from "./gen-ts-tokens.mjs"

const tasks = [
  ["web CSS", runWeb, WEB_OUT],
  ["iOS Swift", runIos, IOS_OUT],
  ["TS tokens", runTs, TS_OUT],
]

let failed = 0
for (const [label, fn, outPath] of tasks) {
  try {
    const out = fn()
    console.log(`✓ ${label.padEnd(12)} → ${path.relative(process.cwd(), out)}`)
  } catch (err) {
    failed += 1
    console.error(`✗ ${label} failed:`, err.message)
  }
}

if (failed > 0) {
  console.error(`\n${failed} codegen task(s) failed`)
  process.exit(1)
}
