import { test, expect } from '@playwright/test'
import { cleanTestCompetitions, seedTestCompetitions } from './helpers/seed'
import { loginAsAdmin } from './helpers/auth'

let compA: string

test.describe('Competition — head judge edita detalhes', () => {

  test.beforeAll(async () => {
    await cleanTestCompetitions()
    const ids = await seedTestCompetitions()
    compA = ids.compA
  })

  test.afterAll(async () => {
    await cleanTestCompetitions()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('head judge edita nome e local da competição', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/edit`)
    await page.waitForLoadState('networkidle')

    const newName = `[TEST] Alpha Renamed ${Date.now()}`
    const nameInput = page.getByPlaceholder('Ex: Open Box Pinheiros 2025')
    await nameInput.fill(newName)

    const venueInput = page.getByPlaceholder('Ex: CF Pinheiros · SP')
    await venueInput.fill('[TEST] Renamed Venue')

    await page.getByRole('button', { name: 'SAVE CHANGES' }).click()
    await page.waitForURL(`**/athlete/competitions/${compA}`, { timeout: 10_000 })

    await expect(page.getByText(newName)).toBeVisible({ timeout: 8_000 })
  })

  test('EDIT COMPETITION aparece na tela de detalhe pro head judge', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'EDIT COMPETITION' })).toBeVisible({ timeout: 8_000 })
  })

})
