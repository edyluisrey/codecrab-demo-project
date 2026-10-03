import { http, HttpResponse } from 'msw'

import type { OrderCreate } from '../types'
import { catalog, demoUser, DEMO_PASSWORD, makeOrder, TEST_TOKEN } from './fixtures'

const unauthorized = () =>
  HttpResponse.json({ detail: 'Could not validate credentials', code: 'unauthorized' }, { status: 401 })

export const handlers = [
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const form = new URLSearchParams(await request.text())
    if (form.get('password') !== DEMO_PASSWORD) {
      return HttpResponse.json(
        { detail: 'Incorrect email or password', code: 'invalid_credentials' },
        { status: 401 },
      )
    }
    return HttpResponse.json({ access_token: TEST_TOKEN, token_type: 'bearer', expires_in: 3600 })
  }),

  http.post('*/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; full_name: string }
    return HttpResponse.json(
      { ...demoUser, id: 2, email: body.email, full_name: body.full_name },
      { status: 201 },
    )
  }),

  http.get('*/api/v1/auth/me', ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${TEST_TOKEN}`
      ? HttpResponse.json(demoUser)
      : unauthorized(),
  ),

  http.get('*/api/v1/products/categories', () =>
    HttpResponse.json([...new Set(catalog.map((p) => p.category))].sort()),
  ),

  http.get('*/api/v1/products/:id', ({ params }) => {
    const product = catalog.find((p) => p.id === Number(params.id))
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json(
          { detail: `Product ${String(params.id)} not found`, code: 'product_not_found' },
          { status: 404 },
        )
  }),

  http.get('*/api/v1/products', ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')?.toLowerCase()
    const search = url.searchParams.get('search')?.toLowerCase()
    const items = catalog.filter(
      (p) =>
        (!category || p.category.toLowerCase() === category) &&
        (!search || `${p.name} ${p.description}`.toLowerCase().includes(search)),
    )
    return HttpResponse.json({ items, total: items.length })
  }),

  http.get('*/api/v1/orders', ({ request }) =>
    request.headers.get('Authorization') ? HttpResponse.json([]) : unauthorized(),
  ),

  http.post('*/api/v1/orders', async ({ request }) => {
    const body = (await request.json()) as OrderCreate
    const items = body.items.map((line, index) => {
      const product = catalog.find((p) => p.id === line.product_id)
      const unitPrice = product?.price ?? 0
      return {
        id: index + 1,
        product_id: line.product_id,
        product_name: product?.name ?? '',
        quantity: line.quantity,
        unit_price: unitPrice,
        line_total: unitPrice * line.quantity,
      }
    })
    return HttpResponse.json(
      makeOrder({ id: 7, items, total_amount: items.reduce((sum, i) => sum + i.line_total, 0) }),
      { status: 201 },
    )
  }),
]
