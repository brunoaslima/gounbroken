import { test, expect } from '@playwright/test'
import { cleanTestCompetitions, seedTestCompetitions, seedLeaderboardEntry } from './helpers/seed'
import { loginAsAdmin } from './helpers/auth'

let compA: string
let teamName: string

test.describe('Leaderboard — placar público', () => {

  test.beforeAll(async () => {
    await cleanTestCompetitions()
    const ids = await seedTestCompetitions()
    compA = ids.compA
    const seeded = await seedLeaderboardEntry(compA)
    teamName = seeded.teamName
  })

  test.afterAll(async () => {
    await cleanTestCompetitions()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('leaderboard mostra o time com resultado publicado', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/leaderboard`)
    await page.waitForLoadState('networkidle')

    // Team name renders both in the table row and in the "leader" banner
    await expect(page.getByText(teamName).first()).toBeVisible({ timeout: 10_000 })
  })

})
