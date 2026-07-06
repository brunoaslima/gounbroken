import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { ensureRole, revertRole } from './helpers/seedRoles'

test.describe('Report & Wrapped', () => {

  let grantedRole = false

  test.beforeAll(async () => {
    grantedRole = await ensureRole('ai')
  })

  test.afterAll(async () => {
    if (grantedRole) await revertRole('ai')
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('report mensal exibe estado vazio e navega entre meses', async ({ page }) => {
    await page.goto('/athlete/report')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('REPORT', { exact: true })).toBeVisible()
    await expect(page.getByText('No workouts recorded in this period')).toBeVisible()

    await page.getByRole('button', { name: 'Previous month' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('No workouts recorded in this period')).toBeVisible()
  })

  test('botão WRAPPED navega para o resumo anual', async ({ page }) => {
    await page.goto('/athlete/report')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'WRAPPED' }).click()
    await page.waitForURL(/\/wrapped/, { timeout: 10_000 })
  })

  test('usuário sem role admin/ai é redirecionado ao acessar report diretamente', async ({ page }) => {
    await revertRole('ai')
    grantedRole = false

    await page.goto('/athlete/report')
    await page.waitForURL(url => !url.pathname.includes('/report'), { timeout: 10_000 })

    // Restaura pro afterAll não quebrar (garantido de novo pelo próximo beforeAll de outro describe, mas
    // aqui já não há mais testes nesse arquivo — nada a restaurar)
  })

})
