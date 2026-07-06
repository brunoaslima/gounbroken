import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { seedTestCompetitions, seedTeamInvite, cleanTestCompetitions } from './helpers/seed'

let compA: string

test.describe('Invite inbox', () => {

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

  test('convite de equipe pendente aparece na inbox e pode ser aceito', async ({ page }) => {
    const { teamName } = await seedTeamInvite(compA)

    await page.goto('/athlete/invites')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('01 PENDING')).toBeVisible()
    await expect(page.getByText(`invited you to team ${teamName}.`)).toBeVisible()

    await page.getByRole('button', { name: 'ACCEPT' }).click()

    // Sai da lista de pendentes e passa a aparecer no histórico como aceito
    await expect(page.getByText('01 PENDING')).not.toBeVisible()
    await expect(page.getByText(`invited you to team ${teamName}.`)).toBeVisible()
    await expect(page.getByText('ACCEPTED', { exact: true })).toBeVisible()
  })

})
