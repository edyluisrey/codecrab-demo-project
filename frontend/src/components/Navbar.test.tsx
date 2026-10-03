import { screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { makeProduct, seedCart, signIn } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import { Navbar } from './Navbar'

const routes = <Route path="*" element={<Navbar />} />

describe('Navbar', () => {
  it('shows the app name, a sign-in button and no Orders link when signed out', () => {
    renderRoutes(routes)

    expect(screen.getByText('codecrab-demo-project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /orders/i })).not.toBeInTheDocument()
  })

  it('shows the cart item count badge', () => {
    seedCart([
      { product: makeProduct({ id: 1 }), quantity: 2 },
      { product: makeProduct({ id: 2 }), quantity: 3 },
    ])

    renderRoutes(routes)

    expect(screen.getByRole('link', { name: 'Cart with 5 items' })).toHaveTextContent('5')
  })

  it('shows the user name and Orders link when signed in, and signs out', async () => {
    signIn()
    const { user } = renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('Demo Crab')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /orders/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(localStorage.getItem('codecrab.token')).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })
})
