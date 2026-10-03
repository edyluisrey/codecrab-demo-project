import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { OrderStatus } from '../types'
import { Badge, OrderStatusBadge } from './Badge'

describe('Badge', () => {
  it('renders its children with the neutral tone by default', () => {
    render(<Badge>Databases</Badge>)

    expect(screen.getByText('Databases')).toHaveClass('bg-slate-100')
  })
})

describe('OrderStatusBadge', () => {
  it.each<[OrderStatus, string]>([
    ['pending', 'bg-amber-100'],
    ['paid', 'bg-emerald-100'],
    ['failed', 'bg-red-100'],
    ['cancelled', 'bg-slate-100'],
  ])('renders %s with a distinct tone', (status, toneClass) => {
    render(<OrderStatusBadge status={status} />)

    expect(screen.getByText(status)).toHaveClass(toneClass)
  })
})
