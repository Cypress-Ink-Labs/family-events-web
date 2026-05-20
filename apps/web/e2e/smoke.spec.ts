import { expect, test } from "@playwright/test"

test("dashboard renders for authenticated admin", async ({ page }) => {
  await page.goto("/home")

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("navigation").getByRole("link", { name: "Explore" })).toBeVisible()
})

test("explore renders search and filters", async ({ page }) => {
  await page.goto("/explore")

  await expect(page.getByRole("heading", { name: /today's adventures/i })).toBeVisible()
  await expect(page.getByPlaceholder("Find activities nearby...")).toBeVisible()
  await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible()
})

test("admin sources opens add-source controls", async ({ page }) => {
  await page.goto("/admin/sources")

  await expect(page.getByRole("heading", { name: "Event Sources" }).nth(1)).toBeVisible()
  await page.getByRole("button", { name: "Add Source" }).first().click()
  await expect(page.getByRole("heading", { name: "Add Event Source" })).toBeVisible()
  await expect(page.getByPlaceholder("e.g. NYC Parks Family Events")).toBeVisible()
  await expect(page.getByPlaceholder("https://...")).toBeVisible()
})

test("admin walkthrough covers decomposed admin pages", async ({ context }) => {
  const checks = [
    {
      path: "/admin",
      heading: "Admin Dashboard",
      control: (page: import("@playwright/test").Page) => page.getByText("Total Events"),
    },
    {
      path: "/admin/sources",
      heading: "Event Sources",
      control: (page: import("@playwright/test").Page) =>
        page.getByRole("button", { name: "Add Source" }).first(),
    },
    {
      path: "/admin/access",
      heading: "Account Access",
      control: (page: import("@playwright/test").Page) =>
        page.getByRole("textbox", { name: "Search by name or email" }),
    },
    {
      path: "/admin/invites",
      heading: "Invite Codes",
      control: (page: import("@playwright/test").Page) =>
        page.getByRole("button", { name: "New code" }),
    },
  ]

  for (const check of checks) {
    const page = await context.newPage()
    try {
      await page.goto(check.path)
      await Promise.all([
        expect(page.getByRole("heading", { name: check.heading }).last()).toBeVisible(),
        expect(check.control(page)).toBeVisible(),
      ])
    } finally {
      await page.close()
    }
  }
})

test("decomposed member pages render", async ({ context }) => {
  const checks = [
    {
      path: "/calendar",
      heading: "Your Adventures",
      control: (page: import("@playwright/test").Page) => page.getByRole("tab", { name: "Month" }),
    },
    {
      path: "/saved",
      heading: "My Events",
      control: (page: import("@playwright/test").Page) =>
        page.getByRole("tab", { name: "Saved Ideas" }),
    },
    {
      path: "/profile",
      heading: "Profile",
      control: (page: import("@playwright/test").Page) =>
        page.getByRole("button", { name: "Save Changes" }),
    },
  ]

  await Promise.all(
    checks.map(async (check) => {
      const page = await context.newPage()
      try {
        await page.goto(check.path)
        await Promise.all([
          expect(page.getByRole("heading", { name: check.heading }).first()).toBeVisible(),
          expect(check.control(page)).toBeVisible(),
        ])
      } finally {
        await page.close()
      }
    })
  )
})
