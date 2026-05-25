import { mkdirSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { GENERATED_BANNER, PKG_ROOT, REPO_ROOT, loadTokens } from "./_lib.mjs"

const OXFMT_CONFIG = path.join(PKG_ROOT, "..", "config-quality", "oxfmt.base.json")

function formatCss(source) {
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

const OUTPUT = path.join(REPO_ROOT, "apps", "web", "src", "styles", "tokens.generated.css")

function emitColors(mode, palette) {
  const lines = []
  for (const [name, t] of Object.entries(palette)) {
    lines.push(`  --color-${name}: oklch(${t.oklch});`)
  }
  // Light values live on :root so .dark can override them at runtime. The
  // dark block has the same shape so the cascade flips every token at once.
  const selector = mode === "light" ? ":root" : ".dark"
  return `${selector} {\n${lines.join("\n")}\n}`
}

function emitThemeColorBindings(palette) {
  // Tailwind v4: @theme inline { --color-X: var(--color-X) } makes the utility
  // class output `background-color: var(--color-X)` — so :root vs .dark
  // cascade controls dark-mode swaps. Without this re-binding, `@theme inline`
  // bakes the literal oklch() value into the utility CSS and dark-mode
  // overrides never apply (the bug that produced unreadable text on selected
  // map-list rows: bg-accent-primary-soft stayed pastel in dark mode).
  const lines = Object.keys(palette).map((name) => `  --color-${name}: var(--color-${name});`)
  return `@theme inline {\n${lines.join("\n")}\n}`
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

function emitTypeFamiliesForTheme(family) {
  // Emit into @theme — skip `mono` to avoid colliding with Tailwind's default --font-mono.
  return Object.entries(family)
    .filter(([k]) => k !== "mono")
    .map(([k, v]) => `  --font-${k}: ${v.stack};`)
    .join("\n")
}

function emitTypeFamiliesRaw(family) {
  // Emit into :root for arbitrary-value access; includes mono.
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
  return formatCss([
    GENERATED_BANNER,
    "",
    "/* Light + dark token values. .dark overrides :root so Tailwind utilities */",
    "/* bound below via `var(--color-*)` flip on dark-mode class. */",
    emitColors("light", tokens.color.light),
    "",
    emitThemeColorBindings(tokens.color.light),
    "",
    "@theme inline {",
    emitTypeFamiliesForTheme(tokens.typography.family),
    "}",
    "",
    "/* :root holds raw CSS variables for inline / arbitrary-value access.",
    "   Names duplicate the @theme block above where applicable; collision-prone",
    "   tokens (radius-*, text-*, shadow-*, font-mono, breakpoint-*) live here ONLY",
    "   so legacy code using Tailwind defaults keeps working. */",
    ":root {",
    emitSpace(tokens.space),
    emitRadius(tokens.radius),
    emitTypeFamiliesRaw(tokens.typography.family),
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
  ].join("\n"))
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
