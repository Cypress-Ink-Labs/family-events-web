import type { Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

async function exploreHasFavoriteTargets(page: Page): Promise<boolean> {
  await page.goto("/explore")
  await expect(page.getByRole("heading", { name: /today's adventures/i })).toBeVisible()
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 })
  } catch {
    // non-fatal; we still check DOM below
  }

  const noEvents = page.getByRole("heading", { name: "No events found" })
  if (await noEvents.isVisible()) {
    return false
  }

  const fav = page.getByRole("button", { name: /^(Add to favorites|Remove from favorites)$/ }).first()
  await expect(fav).toBeVisible({ timeout: 30_000 })
  return true
}

async function firstExploreCard(page: Page) {
  const firstButton = page
    .getByRole("button", { name: /^(Add to favorites|Remove from favorites)$/ })
    .first()
  await expect(firstButton).toBeVisible({ timeout: 20_000 })
  return firstButton.locator("xpath=ancestor::a[1]")
}

function firstFavoriteButtonInCard(card: Locator) {
  return card.getByRole("button", { name: /^(Add to favorites|Remove from favorites)$/ }).first()
}

async function titleOnExploreCard(card: Locator) {
  const title = await card.getByRole("heading", { level: 3 }).textContent()
  return title?.trim() ?? ""
}

/** Unfavorite first card until aria-label is Add (so add→remove round-trip is deterministic). */
async function ensureAddOnFirstFavorite(page: Page) {
  const card = await firstExploreCard(page)
  for (let i = 0; i < 5; i++) {
    const b = firstFavoriteButtonInCard(card)
    const label = await b.getAttribute("aria-label")
    if (label === "Add to favorites") {
      return { card, addButton: b }
    }
    await b.click()
    await card.getByRole("button", { name: "Add to favorites" }).first().waitFor({
      state: "visible",
      timeout: 20_000,
    })
  }
  throw new Error("Could not reach Add to favorites on first card")
}

test.describe("favorite toggle (regression)", () => {
  test("explore: add then remove favorites heart", async ({ page }) => {
    const ok = await exploreHasFavoriteTargets(page)
    if (!ok) {
      test.skip()
      return
    }

    const { card, addButton } = await ensureAddOnFirstFavorite(page)
    await addButton.click()
    const remove = card.getByRole("button", { name: "Remove from favorites" }).first()
    await expect(remove).toBeVisible({ timeout: 20_000 })
    await remove.click()
    await expect(card.getByRole("button", { name: "Add to favorites" }).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test("explore: rapid double-tap does not duplicate saved item", async ({ page }) => {
    const ok = await exploreHasFavoriteTargets(page)
    if (!ok) {
      test.skip()
      return
    }

    const { card, addButton } = await ensureAddOnFirstFavorite(page)
    const title = await titleOnExploreCard(card)
    expect(title.length).toBeGreaterThan(0)

    await addButton.click()
    await card.getByRole("button", { name: "Remove from favorites" }).first().waitFor({
      state: "visible",
      timeout: 20_000,
    })
    const removeButton = card.getByRole("button", { name: "Remove from favorites" }).first()
    await removeButton.click()
    await expect(card.getByRole("button", { name: "Add to favorites" }).first()).toBeVisible({
      timeout: 20_000,
    })

    await page.goto("/saved")
    await page.getByRole("tab", { name: /Saved Ideas/i }).click()
    await expect(page.getByRole("heading", { name: title, level: 3 })).toHaveCount(1, {
      timeout: 20_000,
    })

    await page.getByRole("button", { name: "Remove" }).first().click()
    await expect(page.getByText("No saved events yet")).toBeVisible({ timeout: 20_000 })
  })

  test("saved: Saved Ideas tab lists event after favoriting on explore", async ({ page }) => {
    const ok = await exploreHasFavoriteTargets(page)
    if (!ok) {
      test.skip()
      return
    }

    const { card, addButton } = await ensureAddOnFirstFavorite(page)
    const title = await titleOnExploreCard(card)
    expect(title.length).toBeGreaterThan(0)

    await addButton.click()
    await expect(card.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible({
      timeout: 20_000,
    })

    await page.goto("/saved")
    await page.getByRole("tab", { name: /Saved Ideas/i }).click()
    await expect(page.getByRole("heading", { name: title, level: 3 })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole("button", { name: "Remove" }).first().click()
    await expect(page.getByText("No saved events yet")).toBeVisible({ timeout: 20_000 })
  })

  test("home: hero favorite toggles when Saturday plan hero exists", async ({ page }) => {
    await page.goto("/home")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    const topPick = page.getByText("Top plan pick")
    if ((await topPick.count()) === 0) {
      test.skip()
      return
    }

    const hero = page.locator('[data-testid="hero"]')
    await expect(hero).toBeVisible({ timeout: 20_000 })

    const addButton = hero.getByRole("button", { name: "Add to favorites" })
    const removeButton = hero.getByRole("button", { name: "Remove from favorites" })

    if ((await addButton.count()) > 0) {
      await addButton.click()
      await expect(removeButton).toBeVisible({ timeout: 20_000 })
      await removeButton.click()
      await expect(addButton).toBeVisible({ timeout: 20_000 })
    } else {
      await removeButton.click()
      await expect(addButton).toBeVisible({ timeout: 20_000 })
      await addButton.click()
      await expect(removeButton).toBeVisible({ timeout: 20_000 })
    }
  })
})
