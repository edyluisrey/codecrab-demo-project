import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDate } from './format'

describe('formatCurrency', () => {
  it.each([
    [0, '$0.00'],
    [15, '$15.00'],
    [1234.5, '$1,234.50'],
    [0.1 + 0.2, '$0.30'],
  ])('formats %s as %s', (amount, expected) => {
    expect(formatCurrency(amount)).toBe(expected)
  })
})

describe('formatDate', () => {
  it('formats ISO timestamps as a medium date with time', () => {
    expect(formatDate('2026-10-03T12:00:00Z')).toMatch(/^Oct 3, 2026, \d{1,2}:\d{2}\s?(AM|PM)$/)
  })
})
