import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const { notify } = useToast()
  const outOfStock = product.stock <= 0

  const handleAdd = () => {
    addItem(product)
    notify(`Added ${product.name} to cart`, 'success')
  }

  return (
    <Card padded={false} className="flex flex-col transition-shadow hover:shadow-md">
      <Link to={`/products/${product.id}`} className="block aspect-[16/10] bg-slate-100">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product.id}`} className="font-semibold hover:text-crab-700">
            {product.name}
          </Link>
          <Badge tone="brand">{product.category}</Badge>
        </div>
        <p className="line-clamp-2 flex-1 text-sm text-slate-600">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            {formatCurrency(product.price)}
            <span className="text-xs font-normal text-slate-500"> /mo</span>
          </span>
          <Button size="sm" onClick={handleAdd} disabled={outOfStock}>
            <ShoppingCart className="h-4 w-4" />
            {outOfStock ? 'Sold out' : 'Add'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
