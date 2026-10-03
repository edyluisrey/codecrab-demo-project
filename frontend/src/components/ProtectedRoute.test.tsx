import { screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { signIn } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import { ProtectedRoute } from './ProtectedRoute'

const routes = (
  <>
    <Route path="/login" element={<p>Login page</p>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/orders" element={<p>Secret orders</p>} />
    </Route>
  </>
)

describe('ProtectedRoute', () => {
  it('redirects anonymous users to /login', async () => {
    renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(screen.queryByText('Secret orders')).not.toBeInTheDocument()
  })

  it('renders the protected page once the session is validated', async () => {
    signIn()

    renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('Secret orders')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/orders')
  })

  it('redirects to /login when the stored token is rejected', async () => {
    localStorage.setItem('codecrab.token', 'expired-token')

    renderRoutes(routes, { route: '/orders' })

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(localStorage.getItem('codecrab.token')).toBeNull()
  })
})
