import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Landing / Home — detecção de login', () => {

  test('usuário deslogado vê a landing page mesmo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    // Antes, mobile (viewport < 768) sempre redirecionava pra /login sem
    // mostrar a landing. Agora que detectamos sessão ativa, a landing pode
    // aparecer em qualquer tamanho de tela pra quem não está logado.
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('button', { name: 'CREATE FREE ACCOUNT →', exact: true }).first()).toBeVisible()
  })

  test('usuário logado é redirecionado direto pro app ao acessar /home', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/home')
    await page.waitForURL(/\/athlete/, { timeout: 10_000 })
  })

})
