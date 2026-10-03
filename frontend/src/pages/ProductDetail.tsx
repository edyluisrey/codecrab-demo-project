import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { productsApi } from '../api/products'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageSpinner } from '../components/Spinner'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const productId = Number(id)
  const { addItem } = useCart()
  const { notify } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!Number.isInteger(productId) || productId <= 0) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    productsApi
      .get(productId)
      .then((p) => {
        if (!cancelled) setProduct(p)
      })
      .catch(() => {
        if (!cancelled) setProduct(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (isLoading) return <PageSpinner />

  if (!product) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">Product not found.</p>
        <Link to="/" className="text-crab-700 hover:underline">
          Back to catalog
        </Link>
      </div>
    )
  }

  const maxQuantity = Math.min(product.stock, 100)

  const handleAdd = () => {
    addItem(product, quantity)
    notify(`Added ${quantity} × ${product.name} to cart`, 'success')
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <Card padded={false} className="grid md:grid-cols-2">
        <div className="aspect-[16/10] bg-slate-100 md:aspect-auto">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-5 p-8">
          <div className="space-y-2">
            <Badge tone="brand">{product.category}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-xs uppercase tracking-wide text-slate-400">SKU {product.sku}</p>
          </div>
          <p className="text-slate-700">{product.description}</p>
          <div className="text-3xl font-bold">
            {formatCurrency(product.price)}
            <span className="text-base font-normal text-slate-500"> /mo</span>
          </div>
          <p className="text-sm text-slate-500">
            {product.stock > 0 ? `${product.stock} seats available` : 'Currently sold out'}
          </p>

          <div className="mt-auto flex items-center gap-3">
            <div className="flex items-center rounded-md border border-slate-300">
              <button
                type="button"
                className="p-2 disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="p-2 disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" onClick={handleAdd} disabled={product.stock <= 0}>
              <ShoppingCart className="h-5 w-5" />
              Add to cart
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
