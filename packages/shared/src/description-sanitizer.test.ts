import { describe, expect, it } from "vitest"
import {
  cleanDescription,
  collapseWhitespace,
  decodeHtmlEntities,
  stripDiviShortcodes,
  stripGenericShortcodes,
  stripHtmlPreservingBreaks,
} from "./description-sanitizer"

describe("cleanDescription", () => {
  it("returns null for nullish or empty input", () => {
    expect(cleanDescription(null)).toBeNull()
    expect(cleanDescription(undefined)).toBeNull()
    expect(cleanDescription("")).toBeNull()
    expect(cleanDescription("   \n\t  ")).toBeNull()
  })

  it("strips Divi shortcodes from Rock the Block fixture", () => {
    const input = `[et_pb_section fb_built="1" _builder_version="4.16" global_colors_info="{}"][et_pb_row column_structure="2_5,3_5" _builder_version="4.27.6" background_size="initial" background_position="top_left" background_repeat="repeat" global_colors_info="{}"][et_pb_column type="2_5" _builder_version="4.16"][et_pb_image src="https://example.org/img.png" title_text="Rock the Block"][/et_pb_image][/et_pb_column][/et_pb_row][/et_pb_section]Welcome to Rock the Block!`
    const out = cleanDescription(input)
    expect(out).not.toContain("et_pb")
    expect(out).not.toContain("[")
    expect(out).toContain("Welcome to Rock the Block!")
  })

  it("converts <br> and <p> to newlines", () => {
    const input = "<p>Line one</p><p>Line two</p>Line<br>three"
    const out = cleanDescription(input) ?? ""
    expect(out).toContain("Line one")
    expect(out).toContain("Line two")
    expect(out).toContain("Line\nthree")
  })

  it("strips remaining HTML tags", () => {
    expect(cleanDescription("<strong>Bold</strong> and <em>italic</em>")).toBe("Bold and italic")
  })

  it("decodes common entities", () => {
    expect(cleanDescription("Tom&nbsp;&amp;&nbsp;Jerry&rsquo;s show &hellip;")).toBe(
      "Tom & Jerry's show …"
    )
  })

  it("preserves plain prose unchanged", () => {
    expect(cleanDescription("A normal sentence. Another one.")).toBe(
      "A normal sentence. Another one."
    )
  })

  it("leaves user prose in brackets alone", () => {
    expect(cleanDescription("[See more details below]")).toBe("[See more details below]")
  })
})

describe("stripDiviShortcodes", () => {
  it("strips opening shortcode with attributes", () => {
    expect(stripDiviShortcodes(`[et_pb_section fb_built="1"]Hello`)).toBe("Hello")
  })

  it("strips closing shortcode", () => {
    expect(stripDiviShortcodes("Hello[/et_pb_section]")).toBe("Hello")
  })
})

describe("stripGenericShortcodes", () => {
  it("strips lowercase shortcodes", () => {
    expect(stripGenericShortcodes(`[caption id="x"]My caption[/caption]`)).toBe("My caption")
  })

  it("leaves capitalized prose alone", () => {
    expect(stripGenericShortcodes("[See details]")).toBe("[See details]")
  })
})

describe("stripHtmlPreservingBreaks", () => {
  it("turns <br> into newlines", () => {
    expect(stripHtmlPreservingBreaks("a<br>b<br/>c")).toBe("a\nb\nc")
  })

  it("turns </p> into double newlines", () => {
    expect(stripHtmlPreservingBreaks("<p>a</p><p>b</p>")).toBe("<p>a\n\n<p>b\n\n".replace(/<p>/g, ""))
  })
})

describe("decodeHtmlEntities", () => {
  it("decodes nbsp, amp, smart quotes", () => {
    expect(decodeHtmlEntities("a&nbsp;&amp;&nbsp;b&rsquo;s")).toBe("a & b's")
  })
})

describe("collapseWhitespace", () => {
  it("collapses 3+ newlines to 2", () => {
    expect(collapseWhitespace("a\n\n\n\nb")).toBe("a\n\nb")
  })

  it("collapses runs of spaces", () => {
    expect(collapseWhitespace("a    b")).toBe("a b")
  })
})
