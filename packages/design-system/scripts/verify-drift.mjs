import { readFileSync } from "node:fs"
import path from "node:path"
import { buildCss } from "./gen-web-css.mjs"
import { buildSwift } from "./gen-ios-swift.mjs"
import { buildKotlin } from "./gen-android-kotlin.mjs"
import { buildTs } from "./gen-ts-tokens.mjs"
import { OUTPUT_PATH as WEB_OUT } from "./gen-web-css.mjs"
import { OUTPUT_PATH as IOS_DIST_OUT } from "./gen-ios-swift.mjs"
import { OUTPUT_PATH as ANDROID_DIST_OUT } from "./gen-android-kotlin.mjs"
import { OUTPUT_PATH as TS_OUT } from "./gen-ts-tokens.mjs"
import { loadTokens } from "./_lib.mjs"

function readOrEmpty(p) {
  try {
    return readFileSync(p, "utf8")
  } catch {
    return ""
  }
}

const tokens = loadTokens()
// Check generated outputs that are canonical for this web package.
const targets = [
  ["web CSS", WEB_OUT, buildCss(tokens)],
  ["iOS Swift (dist)", IOS_DIST_OUT, buildSwift(tokens)],
  ["Android Kotlin (dist)", ANDROID_DIST_OUT, buildKotlin(tokens)],
  ["TS tokens", TS_OUT, buildTs(tokens)],
]

let drift = 0
for (const [label, p, expected] of targets) {
  const actual = readOrEmpty(p)
  if (actual !== expected) {
    drift += 1
    console.error(`✗ ${label} drift: ${path.relative(process.cwd(), p)}`)
  } else {
    console.log(`✓ ${label} clean`)
  }
}

if (drift > 0) {
  console.error(
    `\n${drift} generated file(s) drifted. Run: pnpm --filter @cypress-ink-labs/design-system build`
  )
  process.exit(1)
}
