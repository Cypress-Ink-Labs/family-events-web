import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { GENERATED_BANNER, REPO_ROOT, loadTokens } from "./_lib.mjs"

const OUTPUT = path.join(REPO_ROOT, "apps", "web", "src", "styles", "tokens.generated.css")

function emitColors(mode, palette) {
  const lines = []
  for (const [name, t] of Object.entries(palette)) {
    lines.push(`  --color-${name}: oklch(${t.oklch});`)
  }
  return mode === "light"
    ? `:root {\n${lines.join("\n")}\n}`
    : `.dark {\n${lines.join("\n")}\n}`
}

function emitSpace(space) {
  const lines = Object.entries(space).map(([k, v]) => `  --space-${k}: ${v.px}px;`)
  return lines.join("\n")
}

function emitRadius(radius) {
  const lines = Object.entries(radius).map(([k, v]) => {
    const val = v.px >= 9999 ? "9999px" : `${v.px}px`
    return `  --radius-${k}: ${val};`
  })
  return lines.join("\n")
}

function emitTypeFamilies(family) {
  return Object.entries(family)
    .map(([k, v]) => `  --font-${k}: ${v.stack};`)
    .join("\n")
}

function emitTypeScale(scale) {
  const out = []
  for (const [name, entry] of Object.entries(scale)) {
    out.push(`  --text-${name}: ${entry.mobile.px}px;`)
    out.push(`  --text-${name}-lh: ${entry.mobile.lh};`)
    out.push(`  --text-${name}-desktop: ${entry.desktop.px}px;`)
    out.push(`  --text-${name}-desktop-lh: ${entry.desktop.lh};`)
  }
  return out.join("\n")
}

function emitMotion(motion) {
  const out = []
  for (const [k, v] of Object.entries(motion.duration)) out.push(`  --motion-${k}: ${v};`)
  for (const [k, v] of Object.entries(motion.easing)) out.push(`  --easing-${k}: ${v};`)
  return out.join("\n")
}

function emitBreakpoints(bp) {
  return Object.entries(bp)
    .map(([k, v]) => `  --bp-${k}: ${v.px}px;`)
    .join("\n")
}

function emitShadow(shadow) {
  return Object.entries(shadow)
    .map(([k, v]) => `  --shadow-${k}: ${v.value};`)
    .join("\n")
}

function emitZ(z) {
  return Object.entries(z)
    .map(([k, v]) => `  --z-${k}: ${v};`)
    .join("\n")
}

function emitTouch(t) {
  return `  --touch-min: ${t.min.px}px;`
}

export function buildCss(tokens) {
  return [
    GENERATED_BANNER,
    "",
    emitColors("light", tokens.color.light),
    "",
    ":root {",
    emitSpace(tokens.space),
    emitRadius(tokens.radius),
    emitTypeFamilies(tokens.typography.family),
    emitTypeScale(tokens.typography.scale),
    emitMotion(tokens.motion),
    emitBreakpoints(tokens.breakpoint),
    emitShadow(tokens.shadow),
    emitZ(tokens.z),
    emitTouch(tokens.touch),
    "}",
    "",
    emitColors("dark", tokens.color.dark),
    "",
  ].join("\n")
}

export function run() {
  const tokens = loadTokens()
  const css = buildCss(tokens)
  mkdirSync(path.dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, css, "utf8")
  return OUTPUT
}

export const OUTPUT_PATH = OUTPUT

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = run()
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
}
