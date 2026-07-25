import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { ensureRole, revertRole } from './helpers/seedRoles'

test.describe('Admin panel', () => {

  let grantedRole = false

  test.beforeAll(async () => {
    grantedRole = await ensureRole('admin')
  })

  test.afterAll(async () => {
    if (grantedRole) await revertRole('admin')
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('overview mostra stats e navegação entre abas funciona', async ({ page }) => {
    await page.goto('/athlete/admin')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Restricted access')).not.toBeVisible()
    await expect(page.getByText('Total users')).toBeVisible()
    await expect(page.getByText('Role distribution')).toBeVisible()

    await page.getByRole('button', { name: /^Users ·/ }).click()
    await expect(page.getByPlaceholder('Search by name or username…')).toBeVisible()

    await page.getByRole('button', { name: 'Analytics', exact: true }).click()
    await page.getByRole('button', { name: 'Claude', exact: true }).click()

    // Regression guard: admin_get_ai_usage_recent/admin_get_ai_usage_by_user
    // once drifted out of sync with the ai_usage_log schema and silently
    // failed (HTTP 400), leaving these panels empty with no visible error.
    await expect(page.getByText('By function')).toBeVisible()
    await expect(page.getByText('Top users by cost')).toBeVisible()
    await expect(page.getByText('Recent calls')).toBeVisible()

    await page.getByRole('button', { name: 'Overview', exact: true }).click()
  })

  test('busca de usuário na aba Users filtra a lista', async ({ page }) => {
    await page.goto('/athlete/admin')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /^Users ·/ }).click()
    await page.getByPlaceholder('Search by name or username…').fill('zzz_no_such_user_zzz')
    await expect(page.getByText('No users found')).toBeVisible()
  })

})
