import { describe, expect, it } from "vitest"
import { pageTransitionMode } from "./page-transition"

describe("PageTransition", () => {
  it("mounts entering route content before the exiting route has faded out", () => {
    expect(pageTransitionMode).toBe("popLayout")
  })
})
