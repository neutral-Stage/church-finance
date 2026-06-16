import { describe, expect, it } from 'vitest'
import { descriptionSimilarity, findReconciliationMatches } from '@/lib/reconciliation-match'

describe('reconciliation-match', () => {
  it('scores exact amount and date with similar description', () => {
    const matches = findReconciliationMatches(
      {
        parsed_amount: 100,
        parsed_date: '2025-06-01',
        parsed_description: 'Tithe offering deposit',
      },
      [
        {
          id: 'tx-1',
          amount: 100,
          description: 'Tithe offering',
          transaction_date: '2025-06-01',
          type: 'income',
        },
      ]
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.id).toBe('tx-1')
    expect(matches[0]?.score).toBeGreaterThan(0.7)
  })

  it('rejects amount mismatches', () => {
    const matches = findReconciliationMatches(
      {
        parsed_amount: 100,
        parsed_date: '2025-06-01',
        parsed_description: 'Deposit',
      },
      [
        {
          id: 'tx-1',
          amount: 50,
          description: 'Deposit',
          transaction_date: '2025-06-01',
          type: 'income',
        },
      ]
    )

    expect(matches).toHaveLength(0)
  })

  it('computes fuzzy description similarity', () => {
    expect(descriptionSimilarity('Utility bill payment', 'utility bill')).toBeGreaterThan(0.4)
  })
})
