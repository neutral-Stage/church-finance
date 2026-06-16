import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No transactions yet"
        description="Add your first transaction to get started."
      />
    )

    expect(screen.getByRole('heading', { name: 'No transactions yet' })).toBeInTheDocument()
    expect(
      screen.getByText('Add your first transaction to get started.')
    ).toBeInTheDocument()
  })

  it('renders optional icon and action', () => {
    render(
      <EmptyState
        title="Empty funds"
        icon={<span data-testid="empty-icon">icon</span>}
        action={<button type="button">Create fund</button>}
      />
    )

    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create fund' })).toBeInTheDocument()
  })
})
