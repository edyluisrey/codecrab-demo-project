import { test as base, expect, type Locator, type Page } from '@playwright/test'

export const DEMO_EMAIL = 'demo@codecrab.dev'
export const DEMO_PASSWORD = 'codecrab123'

export const test = base.extend({
  page: async ({ page }, use) => {
    // Seeded product images come from picsum.photos; keep tests offline and fast.
    await page.route('https://picsum.photos/**', (route) => route.abort())
    await use(page)
  },
})

export { expect }

export async function signIn(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
}

/** Product cards link both the image and the title; target the title link only. */
export function productTitle(page: Page, name: string): Locator {
  return page.getByRole('main').getByText(name, { exact: true })
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@codecrab.dev`
}
