import { DEMO_EMAIL, expect, signIn, test, uniqueEmail } from './fixtures'

test.describe('Authentication', () => {
  test('redirects anonymous users from protected pages to login', async ({ page }) => {
    await page.goto('/orders')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('rejects bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(DEMO_EMAIL)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Incorrect email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signs in, survives a reload, and signs out', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText('Demo Crab')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Demo Crab')).toBeVisible()

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('registers a new account and is signed in automatically', async ({ page }) => {
    const email = uniqueEmail('e2e.register')

    await page.goto('/register')
    await page.getByLabel('Full name').fill('E2E Crab')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/^Password/).fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('Account created. Welcome aboard!')).toBeVisible()
    await expect(page.getByText('E2E Crab')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('rejects registering an existing email', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Duplicate')
    await page.getByLabel('Email').fill(DEMO_EMAIL)
    await page.getByLabel(/^Password/).fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('An account with this email already exists')).toBeVisible()
  })
})
