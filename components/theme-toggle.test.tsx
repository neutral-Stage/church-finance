import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './theme-toggle'

const setTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    setTheme,
    resolvedTheme: 'light',
  })),
}))

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    setTheme.mockClear()
  })

  it('renders a button with accessible label for switching to dark mode', () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole('button', { name: /switch to dark mode/i })
    ).toBeInTheDocument()
  })

  it('calls setTheme with dark when clicked in light mode', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
