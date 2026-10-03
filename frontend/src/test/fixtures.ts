import type { CartItem, Order, Product, User } from '../types'

export const TEST_TOKEN = 'test-token'
export const DEMO_PASSWORD = 'codecrab123'

export const demoUser: User = {
  id: 1,
  email: 'demo@codecrab.dev',
  full_name: 'Demo Crab',
  is_active: true,
  created_at: '2026-10-03T12:00:00Z',
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 1
  return {
    id,
    sku: `SKU-${id}`,
    name: `Product ${id}`,
    description: 'A developer tool',
    category: 'Databases',
    price: 10,
    stock: 100,
    image_url: null,
    is_active: true,
    ...overrides,
  }
}

export const catalog: Product[] = [
  makeProduct({ id: 1, name: 'CacheBolt Redis', category: 'Databases', price: 15, description: 'Managed Redis cache' }),
  makeProduct({ id: 2, name: 'VaultKey Secrets', category: 'Security', price: 39, description: 'Secrets manager' }),
  makeProduct({ id: 3, name: 'DepScan SCA', category: 'Security', price: 25, stock: 0, description: 'Dependency scanning' }),
]

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: 'pending',
    total_amount: 30,
    payment_intent_id: null,
    created_at: '2026-10-03T12:00:00Z',
    updated_at: '2026-10-03T12:00:00Z',
    items: [
      { id: 1, product_id: 1, product_name: 'CacheBolt Redis', quantity: 2, unit_price: 15, line_total: 30 },
    ],
    ...overrides,
  }
}

export function seedCart(items: CartItem[]): void {
  localStorage.setItem('codecrab.cart', JSON.stringify(items))
}

export function signIn(): void {
  localStorage.setItem('codecrab.token', TEST_TOKEN)
}
