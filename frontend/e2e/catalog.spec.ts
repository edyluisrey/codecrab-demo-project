import { expect, productTitle, test } from './fixtures'

test.describe('Catalog', () => {
  test('lists all seeded products', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Developer Tool Catalog' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^add$/i })).toHaveCount(10)
    await expect(productTitle(page, 'CodeCrab Reviewer')).toBeVisible()
  })

  test('filters by category and keeps the filter in the URL', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Filter by category').selectOption('Security')

    await expect(page).toHaveURL(/category=Security/)
    await expect(productTitle(page, 'VaultKey Secrets')).toBeVisible()
    await expect(productTitle(page, 'DepScan SCA')).toBeVisible()
    await expect(productTitle(page, 'CacheBolt Redis')).toHaveCount(0)
  })

  test('searches by name and description', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('searchbox', { name: 'Search products' }).fill('postgres')

    await expect(page).toHaveURL(/search=postgres/)
    await expect(productTitle(page, 'PGEdge Serverless Postgres')).toBeVisible()
    await expect(page.getByRole('button', { name: /^add$/i })).toHaveCount(1)
  })

  test('opens a product detail page', async ({ page }) => {
    await page.goto('/')

    await productTitle(page, 'CodeCrab Reviewer').click()

    await expect(page).toHaveURL(/\/products\/\d+$/)
    await expect(page.getByRole('heading', { name: 'CodeCrab Reviewer' })).toBeVisible()
    await expect(page.getByText('SKU AI-CODECRAB')).toBeVisible()
    await expect(page.getByText('$99.00')).toBeVisible()
  })

  test('shows a 404 page for unknown routes', async ({ page }) => {
    await page.goto('/does-not-exist')

    await expect(page.getByRole('heading', { name: '404 - Page not found' })).toBeVisible()
  })
})
