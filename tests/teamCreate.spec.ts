import { test, expect } from '@playwright/test'
import { cleanTestCompetitions, seedTestCompetitions } from './helpers/seed'
import { loginAsAdmin } from './helpers/auth'

let compB: string

test.describe('Team — criar time numa competição aberta', () => {

  test.beforeAll(async () => {
    await cleanTestCompetitions()
    const ids = await seedTestCompetitions()
    compB = ids.compB
  })

  test.afterAll(async () => {
    await cleanTestCompetitions()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('atleta cria um time e vai pra tela de gestão do time', async ({ page }) => {
    const teamName = `[TEST] Iron Bears ${Date.now()}`

    await page.goto(`/athlete/competitions/${compB}/team/new`)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Iron Bears').fill(teamName)
    await page.getByRole('button', { name: 'CREATE TEAM →' }).click()

    await page.waitForURL(new RegExp(`/athlete/competitions/${compB}/team/`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible({ timeout: 8_000 })
  })

})
