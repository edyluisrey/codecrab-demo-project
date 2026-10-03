import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderRoutes } from '../test/render'
import { server } from '../test/server'
import Catalog from './Catalog'

const routes = <Route path="/" element={<Catalog />} />

describe('Catalog page', () => {
  it('lists products and categories from the API', async () => {
    renderRoutes(routes)

    expect(await screen.findByText('CacheBolt Redis')).toBeInTheDocument()
    expect(screen.getByText('VaultKey Secrets')).toBeInTheDocument()
    expect(screen.getByText('$15.00')).toBeInTheDocument()

    const select = screen.getByRole('combobox', { name: /filter by category/i })
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['All categories', 'Databases', 'Security'])
  })

  it('filters by category', async () => {
    const { user } = renderRoutes(routes)
    await screen.findByText('CacheBolt Redis')

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by category/i }), 'Security')

    expect(await screen.findByText('VaultKey Secrets')).toBeInTheDocument()
    expect(screen.queryByText('CacheBolt Redis')).not.toBeInTheDocument()
  })

  it('applies the category from the URL on first load', async () => {
    renderRoutes(routes, { route: '/?category=Security' })

    expect(await screen.findByText('VaultKey Secrets')).toBeInTheDocument()
    expect(screen.queryByText('CacheBolt Redis')).not.toBeInTheDocument()
  })

  it('searches with a debounced query', async () => {
    const { user } = renderRoutes(routes)
    await screen.findByText('CacheBolt Redis')

    await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'secrets')

    await waitFor(() => expect(screen.queryByText('CacheBolt Redis')).not.toBeInTheDocument())
    expect(screen.getByText('VaultKey Secrets')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('shows an empty state when nothing matches', async () => {
    server.use(http.get('*/api/v1/products', () => HttpResponse.json({ items: [], total: 0 })))

    renderRoutes(routes)

    expect(await screen.findByText('No products match your filters.')).toBeInTheDocument()
  })

  it('disables Add for out-of-stock products and adds others to the cart', async () => {
    const { user } = renderRoutes(routes)
    await screen.findByText('CacheBolt Redis')

    expect(screen.getByRole('button', { name: /sold out/i })).toBeDisabled()

    const [firstAdd] = screen.getAllByRole('button', { name: /^add$/i })
    await user.click(firstAdd!)

    expect(await screen.findByText('Added CacheBolt Redis to cart')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('codecrab.cart') ?? '[]')).toHaveLength(1)
  })

  it('shows an error toast when the API fails', async () => {
    server.use(
      http.get('*/api/v1/products', () =>
        HttpResponse.json({ detail: 'Internal server error', code: 'internal_error' }, { status: 500 }),
      ),
    )

    renderRoutes(routes)

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('No products match your filters.')).toBeInTheDocument()
  })
})
