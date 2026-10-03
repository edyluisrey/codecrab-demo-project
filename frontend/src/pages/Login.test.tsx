import { screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { DEMO_PASSWORD, TEST_TOKEN } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import Login from './Login'

const routes = (
  <>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<p>Home</p>} />
    <Route path="/orders" element={<p>Orders page</p>} />
  </>
)

describe('Login page', () => {
  it('signs in, stores the token and redirects home', async () => {
    const { user } = renderRoutes(routes, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'demo@codecrab.dev')
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(localStorage.getItem('codecrab.token')).toBe(TEST_TOKEN)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  it('returns the user to the page they came from', async () => {
    const { user } = renderRoutes(routes, {
      route: { pathname: '/login', state: { from: '/orders' } },
    })

    await user.type(screen.getByLabelText('Email'), 'demo@codecrab.dev')
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Orders page')).toBeInTheDocument()
  })

  it('shows the API error and stays on the page for bad credentials', async () => {
    const { user } = renderRoutes(routes, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'demo@codecrab.dev')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(localStorage.getItem('codecrab.token')).toBeNull()
  })

  it('links to registration', () => {
    renderRoutes(routes, { route: '/login' })

    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/register')
  })
})
