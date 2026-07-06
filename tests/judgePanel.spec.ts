import { test, expect } from '@playwright/test'
import { cleanTestCompetitions, seedTestCompetitions, seedApprovedTeamWithWod } from './helpers/seed'
import { loginAsAdmin } from './helpers/auth'

let compA: string
let teamName: string

test.describe('Judge Panel — lançar resultado', () => {

  test.beforeAll(async () => {
    await cleanTestCompetitions()
    const ids = await seedTestCompetitions()
    compA = ids.compA
    const seeded = await seedApprovedTeamWithWod(compA)
    teamName = seeded.teamName
  })

  test.afterAll(async () => {
    await cleanTestCompetitions()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('head judge lança um resultado FOR TIME pro time aprovado', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/judge`)
    await page.waitForLoadState('networkidle')

    // Plain string, not RegExp — teamName contains [TEST], and [ ] are
    // regex metacharacters that would otherwise turn it into a character class.
    await page.getByRole('button', { name: teamName }).click()

    await page.getByPlaceholder('00').first().fill('12')
    await page.getByPlaceholder('00').last().fill('34')

    await page.getByRole('button', { name: 'CONFIRMAR' }).click()

    // Volta pra lista e o time some da fila de pendentes
    await expect(page.getByRole('button', { name: teamName })).not.toBeVisible({ timeout: 8_000 })
  })

})
