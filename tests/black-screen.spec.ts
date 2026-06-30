import { test, expect } from '@playwright/test'

/**
 * Black-screen detection suite.
 *
 * A "black screen" happens when React never mounts — usually because:
 *   1. A JS/CSS asset 404'd (stale service-worker serving old chunk names), OR
 *   2. A module throws at import time before React can render
 *      (e.g. missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars).
 *
 * These tests catch both scenarios without needing a logged-in user.
 */

test.describe('Black-screen detection', () => {

  test('página carrega sem erros fatais no console', async ({ page }) => {
    const fatalErrors: string[] = []

    // Collect any uncaught exceptions or console errors before navigation
    page.on('pageerror', err => fatalErrors.push(err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') fatalErrors.push(msg.text())
    })

    await page.goto('/', { waitUntil: 'networkidle' })

    // No env-var errors, no chunk-load errors, no uncaught exceptions
    const critical = fatalErrors.filter(e =>
      e.includes('Missing Supabase env') ||
      e.includes('Failed to fetch dynamically imported') ||
      e.includes('Importing a module script failed') ||
      e.includes('Cannot find module') ||
      e.includes('ChunkLoadError')
    )
    expect(critical, `Erros fatais encontrados:\n${critical.join('\n')}`).toHaveLength(0)
  })

  test('#root não está vazio — React montou', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const rootChildCount = await page.evaluate(() =>
      document.getElementById('root')?.children.length ?? 0
    )
    expect(rootChildCount, '#root está vazio — React não montou (tela preta)').toBeGreaterThan(0)
  })

  test('página exibe conteúdo visível — não é tela preta', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // After redirect, unauthenticated users land on /login
    // The login page must have at least one visible text element
    await expect(page.locator('body')).not.toBeEmpty()

    const bodyText = await page.evaluate(() => document.body.innerText.trim())
    expect(bodyText.length, 'Nenhum texto visível na página — possível tela preta').toBeGreaterThan(0)
  })

  test('assets JS e CSS carregam com status 200', async ({ page }) => {
    const failedAssets: string[] = []

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/assets/') && response.status() !== 200) {
        failedAssets.push(`${response.status()} ${url}`)
      }
    })

    await page.goto('/', { waitUntil: 'networkidle' })

    expect(
      failedAssets,
      `Assets falharam (service-worker desatualizado?):\n${failedAssets.join('\n')}`
    ).toHaveLength(0)
  })

  test('/login renderiza campos de e-mail e senha', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // If the app mounted correctly, the login form must be visible
    await expect(page.getByPlaceholder('email@dominio.com ou username')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i }).first()).toBeVisible()
  })

})
