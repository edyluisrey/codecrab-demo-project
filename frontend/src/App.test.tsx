import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'
import { signIn } from './test/fixtures'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App routing', () => {
  it('renders the catalog with the navbar on /', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Developer Tool Catalog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /codecrab-demo-project/i })).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: '404 - Page not found' })).toBeInTheDocument()
  })

  it.each(['/cart', '/orders'])('redirects anonymous users from %s to login', async (path) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('lets signed-in users open protected pages', async () => {
    signIn()
    renderAt('/orders')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })
})
