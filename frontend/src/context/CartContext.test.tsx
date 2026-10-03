import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeProduct, seedCart } from '../test/fixtures'
import { CartProvider, useCart } from './CartContext'

const renderCart = () => renderHook(() => useCart(), { wrapper: CartProvider })

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderCart()

    expect(result.current.items).toEqual([])
    expect(result.current.itemCount).toBe(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('adds products and merges repeated adds into one line', () => {
    const { result } = renderCart()
    const product = makeProduct({ id: 1, price: 15 })

    act(() => result.current.addItem(product))
    act(() => result.current.addItem(product, 2))

    expect(result.current.items).toEqual([{ product, quantity: 3 }])
    expect(result.current.itemCount).toBe(3)
    expect(result.current.subtotal).toBe(45)
  })

  it('computes count and subtotal across multiple products', () => {
    const { result } = renderCart()

    act(() => result.current.addItem(makeProduct({ id: 1, price: 15 }), 2))
    act(() => result.current.addItem(makeProduct({ id: 2, price: 39 })))

    expect(result.current.itemCount).toBe(3)
    expect(result.current.subtotal).toBe(69)
  })

  it('clamps quantities to available stock', () => {
    const { result } = renderCart()
    const product = makeProduct({ stock: 3 })

    act(() => result.current.addItem(product, 5))
    expect(result.current.items[0]?.quantity).toBe(3)

    act(() => result.current.updateQuantity(product.id, 10))
    expect(result.current.items[0]?.quantity).toBe(3)
  })

  it('clamps quantities to the order maximum of 100', () => {
    const { result } = renderCart()

    act(() => result.current.addItem(makeProduct({ stock: 1000 }), 250))

    expect(result.current.items[0]?.quantity).toBe(100)
  })

  it('removes a line when its quantity is updated to zero', () => {
    const { result } = renderCart()
    const product = makeProduct()

    act(() => result.current.addItem(product, 2))
    act(() => result.current.updateQuantity(product.id, 0))

    expect(result.current.items).toEqual([])
  })

  it('removes items and clears the cart', () => {
    const { result } = renderCart()

    act(() => result.current.addItem(makeProduct({ id: 1 })))
    act(() => result.current.addItem(makeProduct({ id: 2 })))
    act(() => result.current.removeItem(1))
    expect(result.current.items.map((i) => i.product.id)).toEqual([2])

    act(() => result.current.clear())
    expect(result.current.items).toEqual([])
  })

  it('persists to localStorage and rehydrates on mount', () => {
    const product = makeProduct({ id: 9 })
    const first = renderCart()
    act(() => first.result.current.addItem(product, 2))
    first.unmount()

    expect(JSON.parse(localStorage.getItem('codecrab.cart') ?? '[]')).toEqual([{ product, quantity: 2 }])
    const second = renderCart()
    expect(second.result.current.items).toEqual([{ product, quantity: 2 }])
  })

  it('recovers from corrupted localStorage data', () => {
    localStorage.setItem('codecrab.cart', '{not json')

    expect(renderCart().result.current.items).toEqual([])
  })

  it('ignores non-array data in localStorage', () => {
    localStorage.setItem('codecrab.cart', JSON.stringify({ evil: true }))

    expect(renderCart().result.current.items).toEqual([])
  })

  it('loads a previously seeded cart', () => {
    seedCart([{ product: makeProduct({ price: 5 }), quantity: 4 }])

    expect(renderCart().result.current.subtotal).toBe(20)
  })

  it('throws when used outside CartProvider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used within a CartProvider')
  })
})
