import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { DEMO_PASSWORD, TEST_TOKEN } from '../test/fixtures'
import { renderRoutes } from '../test/render'
import { server } from '../test/server'
import Register from './Register'

const routes = (
  <>
    <Route path="/register" element={<Register />} />
    <Route path="/" element={<p>Home</p>} />
  </>
)

describe('Register page', () => {
  it('registers, signs in automatically and redirects home', async () => {
    let registered: unknown
    server.use(
      http.post('*/api/v1/auth/register', async ({ request }) => {
        registered = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { user } = renderRoutes(routes, { route: '/register' })

    await user.type(screen.getByLabelText('Full name'), 'New Crab')
    await user.type(screen.getByLabelText('Email'), 'new@codecrab.dev')
    await user.type(screen.getByLabelText(/^Password/), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(registered).toEqual({ email: 'new@codecrab.dev', full_name: 'New Crab', password: DEMO_PASSWORD })
    expect(localStorage.getItem('codecrab.token')).toBe(TEST_TOKEN)
    expect(screen.getByText('Account created. Welcome aboard!')).toBeInTheDocument()
  })

  it('shows a conflict error for existing emails', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json(
          { detail: 'An account with this email already exists', code: 'email_taken' },
          { status: 409 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, { route: '/register' })

    await user.type(screen.getByLabelText('Full name'), 'Dup')
    await user.type(screen.getByLabelText('Email'), 'demo@codecrab.dev')
    await user.type(screen.getByLabelText(/^Password/), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/register')
  })

  it('enforces the password length in the form', () => {
    renderRoutes(routes, { route: '/register' })

    const password = screen.getByLabelText(/^Password/)
    expect(password).toHaveAttribute('minLength', '8')
    expect(password).toHaveAttribute('maxLength', '72')
  })
})
