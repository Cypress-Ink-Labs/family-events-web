import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { REPO_ROOT, SWIFT_BANNER, loadTokens } from "./_lib.mjs"

const OUTPUT = path.join(
  REPO_ROOT,
  "apps",
  "ios",
  "Packages",
  "FEDesignSystem",
  "Sources",
  "FEDesignSystem",
  "Generated",
  "Tokens.swift",
)

function hexToRGBA(hex) {
  const cleaned = hex.replace(/^#/, "")
  const expanded = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned
  const r = Number.parseInt(expanded.slice(0, 2), 16) / 255
  const g = Number.parseInt(expanded.slice(2, 4), 16) / 255
  const b = Number.parseInt(expanded.slice(4, 6), 16) / 255
  return { r, g, b, a: 1 }
}

function camel(name) {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

/// Swift identifiers cannot start with a digit. JSON keys like "2xs" / "2xl"
/// get prefixed with `size`/`bp` so they compile as Swift constants. The
/// generated names are local to each `enum`, so the conversion is consistent
/// per-scope.
function swiftIdent(name, prefix) {
  const ident = camel(name)
  return /^[0-9]/.test(ident) ? `${prefix}${ident[0].toUpperCase()}${ident.slice(1)}` : ident
}

function emitColorEntries(palette) {
  return Object.entries(palette)
    .map(([name, t]) => {
      const c = hexToRGBA(t.hex)
      const ident = camel(name)
      // SwiftUI.Color qualifier — inside `enum DesignTokens.Color`, the
      // unqualified `Color` would resolve to the enum itself.
      return `        public static let ${ident} = SwiftUI.Color(red: ${c.r.toFixed(4)}, green: ${c.g.toFixed(4)}, blue: ${c.b.toFixed(4)}, opacity: ${c.a})`
    })
    .join("\n")
}

function emitSpace(space) {
  return Object.entries(space)
    .map(([k, v]) => `    public static let s${k}: CGFloat = ${v.px}`)
    .join("\n")
}

function emitRadius(radius) {
  return Object.entries(radius)
    .map(([k, v]) => `    public static let ${k}: CGFloat = ${v.px}`)
    .join("\n")
}

function emitTextScale(scale) {
  return Object.entries(scale)
    .map(([name, e]) => {
      const ident = swiftIdent(name, "size")
      return `    public static let ${ident}Mobile = TextSize(size: ${e.mobile.px}, lineHeight: ${e.mobile.lh})\n    public static let ${ident}Desktop = TextSize(size: ${e.desktop.px}, lineHeight: ${e.desktop.lh})`
    })
    .join("\n")
}

function emitBreakpoints(bp) {
  return Object.entries(bp)
    .map(([k, v]) => `    public static let ${swiftIdent(k, "bp")}: CGFloat = ${v.px}`)
    .join("\n")
}

export function buildSwift(tokens) {
  return `${SWIFT_BANNER}

import SwiftUI

public enum DesignTokens {
    public enum Color {
        public enum Light {
${emitColorEntries(tokens.color.light)}
        }
        public enum Dark {
${emitColorEntries(tokens.color.dark)}
        }
    }

    public enum Space {
${emitSpace(tokens.space)}
    }

    public enum Radius {
${emitRadius(tokens.radius)}
    }

    public struct TextSize: Sendable {
        public let size: CGFloat
        public let lineHeight: Double
        public init(size: Int, lineHeight: Double) {
            self.size = CGFloat(size)
            self.lineHeight = lineHeight
        }
    }

    public enum TextScale {
${emitTextScale(tokens.typography.scale)}
    }

    public enum FontFamily {
        public static let display = "Fraunces"
        public static let body = "DM Sans"
        public static let editorial = "Newsreader"
        public static let mono = "Geist Mono"
    }

    public enum Breakpoint {
${emitBreakpoints(tokens.breakpoint)}
    }

    public enum Touch {
        public static let min: CGFloat = ${tokens.touch.min.px}
    }
}
`
}

export function run() {
  const tokens = loadTokens()
  const swift = buildSwift(tokens)
  mkdirSync(path.dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, swift, "utf8")
  return OUTPUT
}

export const OUTPUT_PATH = OUTPUT

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = run()
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
}
