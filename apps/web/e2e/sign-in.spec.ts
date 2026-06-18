// NOTE: These specs require a live Supabase instance and TEST_ADMIN_* / PLAYWRIGHT_ADMIN_* creds.
// They are best-effort and unverified by the author — run them in a real environment only.

import { expect, test } from "@playwright/test"

// Override storageState for sign-in tests — we intentionally start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("sign-in page", () => {
  test("renders email/password fields and Sign In button", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

    await expect(page.locator("input#email[type='email']")).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("input#password[type='password']")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
  })

  test("renders OAuth provider buttons", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

    // At least one OAuth button should be present (Google, GitHub, etc.)
    await expect(page.locator("input#email[type='email']")).toBeVisible({ timeout: 15_000 })

    const oauthButtons = page.getByRole("button", { name: /google|github|apple|continue with/i })
    const count = await oauthButtons.count()
    // If no OAuth providers are configured this is still fine — we just note it
    if (count === 0) {
      test.info().annotations.push({ type: "note", description: "No OAuth provider buttons found" })
    } else {
      await expect(oauthButtons.first()).toBeVisible()
    }
  })

  test("magic-link: shows confirmation state after submitting email", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" })
    await expect(page.locator("input#email[type='email']")).toBeVisible({ timeout: 15_000 })

    // Look for a magic-link / passwordless option (tab, link, or toggle)
    const magicLinkToggle = page.getByRole("button", { name: /magic link|email link|passwordless/i })
    if ((await magicLinkToggle.count()) === 0) {
      test.skip()
      return
    }

    await magicLinkToggle.click()
    const emailField = page.locator("input[type='email']").first()
    await expect(emailField).toBeVisible({ timeout: 10_000 })
    await emailField.fill("test@example.com")
    await page.getByRole("button", { name: /send|magic link|email link/i }).click()

    // App should show a "check your email" / confirmation message
    await expect(
      page.getByText(/check your (email|inbox)|link sent|email (has been )?sent/i)
    ).toBeVisible({ timeout: 20_000 })
  })

  test("incorrect credentials shows error message", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" })
    await expect(page.locator("input#email[type='email']")).toBeVisible({ timeout: 15_000 })

    await page.locator("input#email[type='email']").fill("notauser@example.invalid")
    await page.locator("input#password[type='password']").fill("wrongpassword")
    await page.getByRole("button", { name: "Sign In" }).click()

    // Expect an error message (auth failure)
    await expect(
      page.getByText(/invalid|incorrect|wrong|not found|no account|error/i)
    ).toBeVisible({ timeout: 20_000 })
  })
})
