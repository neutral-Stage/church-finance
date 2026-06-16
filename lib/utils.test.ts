import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate } from './utils'

describe('formatCurrency', () => {
  it('formats numbers as BDT with two decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('৳1,234.50')
    expect(formatCurrency(0)).toBe('৳0.00')
  })

  it('formats string amounts', () => {
    expect(formatCurrency('99.9')).toBe('৳99.90')
  })

  it('uses the first element when given an array', () => {
    expect(formatCurrency([250, 100])).toBe('৳250.00')
  })

  it('handles null, undefined, and invalid values as zero', () => {
    expect(formatCurrency(null)).toBe('৳0.00')
    expect(formatCurrency(undefined)).toBe('৳0.00')
    expect(formatCurrency('not-a-number')).toBe('৳0.00')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string in en-US short month style', () => {
    expect(formatDate('2024-03-15T12:00:00.000Z')).toBe('Mar 15, 2024')
  })

  it('formats a date-only string', () => {
    expect(formatDate('2025-01-01')).toMatch(/Jan 1, 2025/)
  })
})
