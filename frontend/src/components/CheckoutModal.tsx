import { X } from 'lucide-react'

import { formatCurrency } from '../utils/format'
import { Button } from './Button'

export function CheckoutModal({ isOpen, items, total, isLoading, onConfirm, onClose }: any) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="checkout-modal-title" className="text-lg font-semibold">
            Confirm your order
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((item: any) => (
            <li key={item.product.id} className="flex justify-between py-2">
              <span>
                {item.product.name} <span className="text-slate-500">× {item.quantity}</span>
              </span>
              <span>{formatCurrency(item.product.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button fullWidth onClick={onConfirm} isLoading={isLoading}>
            Confirm payment
          </Button>
        </div>
      </div>
    </div>
  )
}
