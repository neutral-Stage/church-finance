import { test, expect } from '@playwright/test'

test.describe('Demo mode login', () => {
  test('signs in via API and loads the dashboard', async ({ page }) => {
    const signIn = await page.request.post('/api/auth/signin', {
      data: { email: 'admin@church.com', password: 'admin123' },
    })
    expect(signIn.ok()).toBeTruthy()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Church Finance Dashboard')).toBeVisible()
  })
})
