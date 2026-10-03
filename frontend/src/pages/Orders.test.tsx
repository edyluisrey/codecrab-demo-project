import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { makeOrder, signIn } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import { server } from '../test/server'
import Orders from './Orders'

const routes = <Route path="/orders" element={<Orders />} />

describe('Orders page', () => {
  it('shows an empty state when the user has no orders', async () => {
    signIn()
    renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })

  it('lists orders with status, items and totals', async () => {
    server.use(
      http.get('*/api/v1/orders', () =>
        HttpResponse.json([
          makeOrder({ id: 12, status: 'paid', total_amount: 197 }),
          makeOrder({ id: 11, status: 'failed' }),
        ]),
      ),
    )
    signIn()
    renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('Order #12')).toBeInTheDocument()
    expect(screen.getByText('Order #11')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText('$197.00')).toBeInTheDocument()
    expect(screen.getAllByText(/× 2 @ \$15\.00/)).toHaveLength(2)
  })
})
