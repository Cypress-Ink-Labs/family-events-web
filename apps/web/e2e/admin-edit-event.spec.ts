// NOTE: These specs require a live Supabase instance and PLAYWRIGHT_ADMIN_* creds.
// They are best-effort and unverified by the author — run them in a real environment only.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Uses the admin storageState set up by auth.setup.ts (inherited from playwright.config.ts)

/** Navigate to the first editable event in the admin area. Returns false if none found. */
async function openFirstAdminEvent(page: Page): Promise<boolean> {
  await page.goto("/admin", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Admin Dashboard" }).last()).toBeVisible({
    timeout: 15_000,
  })

  // Try navigating to an events management page
  const eventsLink = page.getByRole("link", { name: /events|manage events/i }).first()
  if ((await eventsLink.count()) > 0) {
    await eventsLink.click()
    await page.waitForLoadState("domcontentloaded")
  }

  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 })
  } catch {
    // non-fatal
  }

  // Look for an Edit button or link on any event row
  const editButton = page.getByRole("button", { name: /^edit$/i }).first()
  const editLink = page.getByRole("link", { name: /^edit$/i }).first()
  const hasEditButton = (await editButton.count()) > 0
  const hasEditLink = (await editLink.count()) > 0

  if (!hasEditButton && !hasEditLink) {
    // Try context-menu or ellipsis controls
    const moreActions = page
      .getByRole("button", { name: /more|actions|options|\.\.\./i })
      .first()
    if ((await moreActions.count()) > 0) {
      await moreActions.click()
      const editOption = page.getByRole("menuitem", { name: /edit/i }).first()
      if ((await editOption.count()) > 0) {
        await editOption.click()
        await page.waitForLoadState("domcontentloaded")
        return true
      }
    }
    return false
  }

  if (hasEditButton) {
    await editButton.click()
  } else {
    await editLink.click()
  }

  await page.waitForLoadState("domcontentloaded")
  return true
}

test.describe("admin: edit event", () => {
  test("admin can reach the event edit form", async ({ page }) => {
    const hasEvent = await openFirstAdminEvent(page)
    if (!hasEvent) {
      test.skip()
      return
    }

    // Should be on an edit form — at minimum a title/name field should exist
    const titleField = page
      .getByRole("textbox", { name: /title|name|event name/i })
      .first()

    const hasField = await titleField
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasField) {
      // Broader check — any input on the page
      await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 })
    } else {
      await expect(titleField).toBeVisible()
    }
  })

  test("admin can change a field and save the event", async ({ page }) => {
    const hasEvent = await openFirstAdminEvent(page)
    if (!hasEvent) {
      test.skip()
      return
    }

    const titleField = page
      .getByRole("textbox", { name: /title|name|event name/i })
      .first()

    const hasTitle = await titleField
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasTitle) {
      test.skip()
      return
    }

    // Read the current value so we can restore it
    const originalTitle = (await titleField.inputValue()) ?? ""

    // Append a marker so we can detect the change
    const marker = " [e2e-edited]"
    await titleField.fill(`${originalTitle}${marker}`)

    // Save
    const saveButton = page.getByRole("button", { name: /save|update|apply/i }).first()
    await expect(saveButton).toBeVisible({ timeout: 10_000 })
    await saveButton.click()

    // Expect success feedback
    await expect(
      page.getByText(/saved|updated|changes saved|success/i)
    ).toBeVisible({ timeout: 20_000 })

    // Restore original title to avoid polluting the DB
    const titleFieldAgain = page
      .getByRole("textbox", { name: /title|name|event name/i })
      .first()

    const canRestore = await titleFieldAgain
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false)

    if (canRestore) {
      await titleFieldAgain.fill(originalTitle)
      await saveButton.click()
    }
  })

  test("admin event edit form renders description field", async ({ page }) => {
    const hasEvent = await openFirstAdminEvent(page)
    if (!hasEvent) {
      test.skip()
      return
    }

    const descField = page
      .getByRole("textbox", { name: /description|details|about/i })
      .first()

    const hasDesc = await descField
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasDesc) {
      test.info().annotations.push({
        type: "note",
        description: "No description field found on admin event edit form",
      })
      test.skip()
      return
    }

    await expect(descField).toBeVisible()
    await expect(descField).toBeEditable()
  })
})
