import { screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderRoutes } from '../test/render'
import ProductDetail from './ProductDetail'

const routes = <Route path="/products/:id" element={<ProductDetail />} />

describe('ProductDetail page', () => {
  it('renders product details', async () => {
    renderRoutes(routes, { route: '/products/2' })

    expect(await screen.findByRole('heading', { name: 'VaultKey Secrets' })).toBeInTheDocument()
    expect(screen.getByText('SKU SKU-2')).toBeInTheDocument()
    expect(screen.getByText('$39.00')).toBeInTheDocument()
    expect(screen.getByText('100 seats available')).toBeInTheDocument()
  })

  it('adds the selected quantity to the cart', async () => {
    const { user } = renderRoutes(routes, { route: '/products/2' })
    await screen.findByRole('heading', { name: 'VaultKey Secrets' })

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /increase quantity/i }))
    await user.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(await screen.findByText('Added 2 × VaultKey Secrets to cart')).toBeInTheDocument()
    const cart = JSON.parse(localStorage.getItem('codecrab.cart') ?? '[]') as { quantity: number }[]
    expect(cart[0]?.quantity).toBe(2)
  })

  it('disables purchasing for sold-out products', async () => {
    renderRoutes(routes, { route: '/products/3' })

    expect(await screen.findByText('Currently sold out')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()
  })

  it('shows not-found for unknown products', async () => {
    renderRoutes(routes, { route: '/products/999' })

    expect(await screen.findByText('Product not found.')).toBeInTheDocument()
  })

  it('shows not-found for invalid ids without calling the API', async () => {
    renderRoutes(routes, { route: '/products/abc' })

    expect(await screen.findByText('Product not found.')).toBeInTheDocument()
  })
})
