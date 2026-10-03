import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { CartItem, Product } from '../types'

const CART_KEY = 'codecrab.cart'
const MAX_QUANTITY = 100

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CartItem[]) : []
  } catch {
    return []
  }
}

function clampQuantity(quantity: number, product: Product): number {
  return Math.max(1, Math.min(quantity, product.stock, MAX_QUANTITY))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.product.id === product.id)
      if (existing) {
        return current.map((i) =>
          i.product.id === product.id
            ? { product, quantity: clampQuantity(i.quantity + quantity, product) }
            : i,
        )
      }
      return [...current, { product, quantity: clampQuantity(quantity, product) }]
    })
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.product.id !== productId)
        : current.map((i) =>
            i.product.id === productId ? { ...i, quantity: clampQuantity(quantity, i.product) } : i,
          ),
    )
  }, [])

  const removeItem = useCallback((productId: number) => {
    setItems((current) => current.filter((i) => i.product.id !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    return { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clear }
  }, [items, addItem, updateQuantity, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
