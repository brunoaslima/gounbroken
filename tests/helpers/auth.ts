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
  await page.getByPlaceholder('email@dominio.com ou username').fill(ADMIN_EMAIL)

  // Preenche senha (primeiro campo de password visível)
  await page.getByPlaceholder('••••••••').first().fill(ADMIN_PASS)

  // Submete
  await page.getByRole('button', { name: /^Entrar$/i }).first().click()

  // Aguarda sair do /login
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}
