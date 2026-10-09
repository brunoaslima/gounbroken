import { test, expect } from '@playwright/test'

test.describe('Inscrições suspensas (beta fechado)', () => {
  test('aba Create Account mostra o aviso e não mostra o formulário', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /^Create Account$/i }).click()
    await expect(page.getByText(/Sign-ups suspended/i)).toBeVisible()
    await expect(page.getByText(/open to more users soon/i)).toBeVisible()
    await expect(page.getByPlaceholder('username', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Continue/i })).toHaveCount(0)
  })

  test('/login?tab=signup cai direto no aviso', async ({ page }) => {
    await page.goto('/login?tab=signup')
    await expect(page.getByText(/Sign-ups suspended/i)).toBeVisible()
    await expect(page.getByPlaceholder('username', { exact: true })).toHaveCount(0)
  })

  test('link de convite não promete criação de conta', async ({ page }) => {
    await page.goto('/login?ref=ABC123&tab=signup')
    await expect(page.getByText(/Sign-ups are suspended during the beta/i)).toBeVisible()
    await expect(page.getByText(/Create your account to continue/i)).toHaveCount(0)
  })

  test('Back to Sign In volta ao login e o login segue disponível', async ({ page }) => {
    await page.goto('/login?tab=signup')
    await page.getByRole('button', { name: /Back to Sign In/i }).click()
    await expect(page.getByPlaceholder('email@domain.com or username')).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: /^Sign In$/i })).toBeVisible()
  })
})
