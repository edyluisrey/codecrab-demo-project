import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { OrderCreate } from '../types'
import { catalog, seedCart, signIn } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import { server } from '../test/server'
import Cart from './Cart'

const [cacheBolt, vaultKey] = catalog as [(typeof catalog)[number], (typeof catalog)[number]]

const routes = (
  <>
    <Route path="/cart" element={<Cart />} />
    <Route path="/orders" element={<p>Orders page</p>} />
  </>
)

describe('Cart page', () => {
  it('shows an empty state', () => {
    renderRoutes(routes, { route: '/cart' })

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('lists cart lines with totals and updates quantities', async () => {
    seedCart([{ product: cacheBolt, quantity: 2 }])
    const { user } = renderRoutes(routes, { route: '/cart' })

    expect(screen.getByText('CacheBolt Redis')).toBeInTheDocument()
    expect(screen.getAllByText('$30.00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Increase CacheBolt Redis quantity' }))
    expect(screen.getAllByText('$45.00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Remove CacheBolt Redis' }))
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('places an order, clears the cart and navigates to Orders', async () => {
    let submitted: OrderCreate | undefined
    server.use(
      http.post('*/api/v1/orders', async ({ request }) => {
        submitted = (await request.json()) as OrderCreate
        return HttpResponse.json({ id: 7 }, { status: 201 })
      }),
    )
    signIn()
    seedCart([
      { product: cacheBolt, quantity: 2 },
      { product: vaultKey, quantity: 1 },
    ])
    const { user } = renderRoutes(routes, { route: '/cart' })

    await user.type(screen.getByLabelText(/coupon code/i), '  SAVE10 ')
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText('Orders page')).toBeInTheDocument()
    expect(submitted).toEqual({
      items: [
        { product_id: cacheBolt.id, quantity: 2 },
        { product_id: vaultKey.id, quantity: 1 },
      ],
      coupon_code: 'SAVE10',
    })
    expect(screen.getByText('Order #7 placed successfully')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('codecrab.cart') ?? '[]')).toEqual([])
  })

  it('sends a null coupon when the field is blank', async () => {
    let submitted: OrderCreate | undefined
    server.use(
      http.post('*/api/v1/orders', async ({ request }) => {
        submitted = (await request.json()) as OrderCreate
        return HttpResponse.json({ id: 8 }, { status: 201 })
      }),
    )
    signIn()
    seedCart([{ product: cacheBolt, quantity: 1 }])
    const { user } = renderRoutes(routes, { route: '/cart' })

    await user.click(screen.getByRole('button', { name: /place order/i }))

    await screen.findByText('Orders page')
    expect(submitted?.coupon_code).toBeNull()
  })

  it('keeps the cart and shows the error when checkout fails', async () => {
    server.use(
      http.post('*/api/v1/orders', () =>
        HttpResponse.json(
          { detail: "Insufficient stock for 'CacheBolt Redis'", code: 'insufficient_stock' },
          { status: 400 },
        ),
      ),
    )
    signIn()
    seedCart([{ product: cacheBolt, quantity: 1 }])
    const { user } = renderRoutes(routes, { route: '/cart' })

    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText("Insufficient stock for 'CacheBolt Redis'")).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/cart')
    expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled()
    expect(JSON.parse(localStorage.getItem('codecrab.cart') ?? '[]')).toHaveLength(1)
  })
})
