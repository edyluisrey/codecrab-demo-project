import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes, useLocation, type MemoryRouterProps } from 'react-router-dom'

import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import { ToastProvider } from '../context/ToastContext'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

type InitialEntry = NonNullable<MemoryRouterProps['initialEntries']>[number]

interface RenderOptions {
  route?: InitialEntry
}

/** Renders `<Route>` elements inside the app's providers and a memory router. */
export function renderRoutes(routes: ReactNode, { route = '/' }: RenderOptions = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>{routes}</Routes>
              <LocationDisplay />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    ),
  }
}
