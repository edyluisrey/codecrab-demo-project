import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ordersApi } from '../api/orders'
import { OrderStatusBadge } from '../components/Badge'
import { Card } from '../components/Card'
import { PageSpinner } from '../components/Spinner'
import type { Order } from '../types'
import { formatCurrency, formatDate } from '../utils/format'

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ordersApi
      .list()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch(() => {
        if (!cancelled) setOrders([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) return <PageSpinner />

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Package className="h-12 w-12 text-slate-300" />
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <Link to="/" className="text-crab-700 hover:underline">
          Start shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Order history</h1>
      {orders.map((order) => (
        <Card key={order.id} padded={false}>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div>
              <p className="font-semibold">Order #{order.id}</p>
              <p className="text-sm text-slate-500">{formatDate(order.created_at)}</p>
            </div>
            <div className="flex items-center gap-4">
              <OrderStatusBadge status={order.status} />
              <span className="text-lg font-bold">{formatCurrency(order.total_amount)}</span>
            </div>
          </header>
          <ul className="divide-y divide-slate-100 px-6">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <span>
                  {item.product_name}{' '}
                  <span className="text-slate-500">
                    × {item.quantity} @ {formatCurrency(item.unit_price)}
                  </span>
                </span>
                <span className="font-medium">{formatCurrency(item.line_total)}</span>
              </li>
            ))}
          </ul>
          {/* TODO(roadmap): cancel / refund actions for eligible orders. */}
        </Card>
      ))}
    </div>
  )
}
