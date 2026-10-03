import { expect, productTitle, signIn, test, uniqueEmail } from './fixtures'

test.describe('Checkout', () => {
  test('a new shopper buys products and sees the order in history', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Checkout Crab')
    await page.getByLabel('Email').fill(uniqueEmail('e2e.checkout'))
    await page.getByLabel(/^Password/).fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Checkout Crab')).toBeVisible()

    await productTitle(page, 'CodeCrab Reviewer').click()
    await page.getByRole('button', { name: 'Increase quantity' }).click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added 2 × CodeCrab Reviewer to cart')).toBeVisible()

    await page.goto('/')
    await productTitle(page, 'DocSync Wiki').click()
    await page.getByRole('button', { name: 'Add to cart' }).click()

    await expect(page.getByRole('link', { name: 'Cart with 3 items' })).toBeVisible()
    await page.getByRole('link', { name: 'Cart with 3 items' }).click()

    await expect(page.getByRole('heading', { name: 'Shopping cart' })).toBeVisible()
    await expect(page.getByText('$210.00')).toBeVisible()

    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('button', { name: 'Confirm payment' }).click()

    await expect(page).toHaveURL(/\/orders$/)
    await expect(page.getByText(/Order #\d+ placed successfully/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Order history' })).toBeVisible()
    await expect(page.getByText('pending')).toBeVisible()
    await expect(page.getByText('$210.00')).toBeVisible()
    await expect(page.getByText('CodeCrab Reviewer')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cart with 0 items' })).toBeVisible()
  })

  test('orders are private to each shopper', async ({ page }) => {
    await signIn(page)
    await page.goto('/')
    await productTitle(page, 'CacheBolt Redis').click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('button', { name: 'Confirm payment' }).click()
    await expect(page).toHaveURL(/\/orders$/)
    await page.getByRole('button', { name: /sign out/i }).click()

    await page.goto('/register')
    await page.getByLabel('Full name').fill('Other Crab')
    await page.getByLabel('Email').fill(uniqueEmail('e2e.other'))
    await page.getByLabel(/^Password/).fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Other Crab')).toBeVisible()

    await page.goto('/orders')
    await expect(page.getByText('No orders yet')).toBeVisible()
  })
})
