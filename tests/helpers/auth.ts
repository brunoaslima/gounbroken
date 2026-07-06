import type { Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD!

/**
 * Faz login como admin na UI e aguarda redirecionar para fora do /login.
 * Usa sessionStorage para reutilizar sessão entre testes do mesmo worker.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Preenche e-mail ou username
  await page.getByPlaceholder('email@domain.com or username').fill(ADMIN_EMAIL)

  // Preenche senha (primeiro campo de password visível)
  await page.getByPlaceholder('••••••••').first().fill(ADMIN_PASS)

  // Submete — botão de submit do form, não a aba "Sign In" do topo
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().click()

  // Aguarda sair do /login
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}
