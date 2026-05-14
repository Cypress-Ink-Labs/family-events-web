import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { expect, test as setup } from "@playwright/test"

const authFile = "e2e/.auth/admin.json"
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "admin@familyevents.local"
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "Admin123!"

setup.setTimeout(60_000)

setup("authenticate local admin", async ({ page }) => {
  await mkdir(dirname(authFile), { recursive: true })

  // Surface app boot crashes (e.g. missing VITE_SUPABASE_URL fails the env
  // schema at module load) as diagnostic test failures instead of generic
  // "element not found" timeouts.
  const consoleErrors: string[] = []
  page.on("pageerror", (error) => {
    consoleErrors.push(`pageerror: ${error.message}`)
  })
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`console.error: ${msg.text()}`)
    }
  })

  await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

  const emailField = page.getByLabel(/email/i)
  const passwordField = page.getByLabel(/password/i)

  // 15s is plenty for a vite dev server to render the sign-in form. Beyond
  // that, the app almost certainly crashed on boot — fail fast with the
  // captured console output instead of waiting a full minute for nothing.
  const isLoginFormVisible = await emailField
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false)

  if (isLoginFormVisible) {
    await emailField.fill(adminEmail)
    await passwordField.fill(adminPassword)
    await page.getByRole("button", { name: "Sign In" }).click()
  } else if (!page.url().match(/\/home$/)) {
    const url = page.url()
    const errors = consoleErrors.length > 0 ? `\n${consoleErrors.join("\n")}` : ""
    throw new Error(
      `Sign-in form did not render and we are not on /home (url=${url}). ` +
        `Most likely cause: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY ` +
        `is missing or invalid, so the env schema in src/env.ts threw at ` +
        `module load. Console:${errors}`
    )
  }

  await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
