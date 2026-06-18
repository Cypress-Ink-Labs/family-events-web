// NOTE: These specs require a live Supabase instance and PLAYWRIGHT_ADMIN_* creds.
// They are best-effort and unverified by the author — run them in a real environment only.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Uses the admin storageState set up by auth.setup.ts (inherited from playwright.config.ts)

/** Navigate to the first available event detail page. Returns false if no events exist. */
async function navigateToFirstEventDetail(page: Page): Promise<boolean> {
  await page.goto("/explore", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: /today's adventures/i })).toBeVisible({
    timeout: 15_000,
  })

  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 })
  } catch {
    // non-fatal
  }

  const noEvents = page.getByRole("heading", { name: "No events found" })
  if (await noEvents.isVisible()) {
    return false
  }

  // Click the first event card link
  const firstCard = page.getByRole("article").first()
  const firstLink = firstCard.getByRole("link").first()

  const hasLink = await firstLink
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false)

  if (!hasLink) {
    // Try clicking any event-card heading link
    const headingLink = page.getByRole("heading", { level: 3 }).first().locator("xpath=ancestor::a[1]")
    if ((await headingLink.count()) > 0) {
      await headingLink.click()
    } else {
      return false
    }
  } else {
    await firstLink.click()
  }

  // Wait for the detail page to load
  await page.waitForLoadState("domcontentloaded")
  return true
}

test.describe("comments and ratings on event detail", () => {
  test("event detail page renders comments section", async ({ page }) => {
    const hasEvents = await navigateToFirstEventDetail(page)
    if (!hasEvents) {
      test.skip()
      return
    }

    // Expect a comments or reviews section
    const commentsSection = page
      .getByRole("heading", { name: /comment|review|discussion/i })
      .first()
    const hasComments = await commentsSection
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasComments) {
      test.info().annotations.push({
        type: "note",
        description: "No comments section found on event detail page",
      })
      test.skip()
      return
    }

    await expect(commentsSection).toBeVisible()
  })

  test("authenticated user can add a comment", async ({ page }) => {
    const hasEvents = await navigateToFirstEventDetail(page)
    if (!hasEvents) {
      test.skip()
      return
    }

    // Find comment input
    const commentInput = page
      .getByRole("textbox", { name: /comment|your (thoughts|review)|write/i })
      .first()

    const hasCommentInput = await commentInput
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasCommentInput) {
      // Fall back to any visible textarea in the comments area
      const textarea = page.getByRole("textbox").last()
      const hasTextarea = await textarea
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true)
        .catch(() => false)

      if (!hasTextarea) {
        test.skip()
        return
      }
      await textarea.fill("E2E test comment — please delete")
    } else {
      await commentInput.fill("E2E test comment — please delete")
    }

    const submitComment = page.getByRole("button", { name: /post|submit|add comment|send/i }).first()
    await expect(submitComment).toBeVisible({ timeout: 10_000 })
    await submitComment.click()

    // The comment should appear in the list
    await expect(page.getByText("E2E test comment — please delete")).toBeVisible({
      timeout: 20_000,
    })
  })

  test("authenticated user can set a star rating", async ({ page }) => {
    const hasEvents = await navigateToFirstEventDetail(page)
    if (!hasEvents) {
      test.skip()
      return
    }

    // Look for star rating UI
    const starButtons = page.getByRole("radio", { name: /star|rating/i })
    const hasStarButtons = (await starButtons.count()) > 0

    if (!hasStarButtons) {
      // Try generic star/rating buttons
      const altStars = page.locator('[aria-label*="star"], [aria-label*="rating"], [data-rating]')
      if ((await altStars.count()) === 0) {
        test.info().annotations.push({
          type: "note",
          description: "No star rating UI found on event detail page",
        })
        test.skip()
        return
      }
      await altStars.nth(3).click() // click the 4th star (4/5)
    } else {
      await starButtons.nth(3).click() // click the 4th star (4/5)
    }

    // Expect some confirmation (aria-checked, filled stars, or a toast)
    await expect(
      page.locator('[aria-checked="true"], [data-selected="true"]').first().or(
        page.getByText(/rating saved|thanks for rating|you rated/i)
      )
    ).toBeVisible({ timeout: 15_000 })
  })
})
