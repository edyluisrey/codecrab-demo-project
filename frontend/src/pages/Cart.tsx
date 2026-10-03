import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ordersApi } from '../api/orders'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../utils/format'

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const order = await ordersApi.create({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        // TODO(roadmap): coupon codes are sent but not yet validated by the backend.
        coupon_code: couponCode.trim() || null,
      })
      clear()
      notify(`Order #${order.id} placed successfully`, 'success')
      navigate('/orders')
    } catch {
      // Errors are surfaced by the global API error toast.
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-slate-300" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link to="/" className="text-crab-700 hover:underline">
          Browse the catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Shopping cart</h1>
        {items.map(({ product, quantity }) => (
          <Card key={product.id} className="flex items-center gap-4">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
              {product.image_url && (
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/products/${product.id}`} className="font-medium hover:text-crab-700">
                {product.name}
              </Link>
              <p className="text-sm text-slate-500">{formatCurrency(product.price)} each</p>
            </div>
            <div className="flex items-center rounded-md border border-slate-300">
              <button
                type="button"
                className="p-1.5"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                aria-label={`Decrease ${product.name} quantity`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <button
                type="button"
                className="p-1.5"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                aria-label={`Increase ${product.name} quantity`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="w-24 text-right font-semibold">
              {formatCurrency(product.price * quantity)}
            </span>
            <button
              type="button"
              onClick={() => removeItem(product.id)}
              className="text-slate-400 hover:text-red-600"
              aria-label={`Remove ${product.name}`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </Card>
        ))}
      </section>

      <aside>
        <Card className="sticky top-24">
          <form onSubmit={handleCheckout} className="space-y-4">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <label className="block space-y-1">
              <span className="text-sm text-slate-600">Coupon code</span>
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                maxLength={32}
                placeholder="Coming soon"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-crab-500 focus:outline-none focus:ring-2 focus:ring-crab-200"
              />
            </label>
            <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
              Place order
            </Button>
          </form>
        </Card>
      </aside>
    </div>
  )
}
