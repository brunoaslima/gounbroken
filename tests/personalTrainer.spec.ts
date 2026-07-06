import { test, expect, type Page, type Locator } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import {
  linkTestAthlete,
  unlinkTestAthlete,
  cleanCoachTestWorkouts,
  ensurePersonalRole,
  revertPersonalRole,
  type TestAthlete,
} from './helpers/seedPersonal'

let athlete: TestAthlete
let grantedPersonalRole = false

// WorkoutCard renders its sections/exercises only when expanded, and the
// athlete detail page may already have other real prescribed workouts —
// so find and expand the specific card that contains our test movement,
// leaving it expanded for the caller.
async function expandCardContaining(page: Page, text: string): Promise<Locator> {
  const toggles = page.locator('button.w-full.flex.items-start')
  const count = await toggles.count()
  for (let i = 0; i < count; i++) {
    const toggle = toggles.nth(i)
    const card = toggle.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    await toggle.click()
    if (await card.getByText(text).isVisible().catch(() => false)) return card
    await toggle.click() // not this one — collapse back
  }
  throw new Error(`No workout card contains text: ${text}`)
}

test.describe('Personal Trainer — lista de alunos e treino prescrito', () => {

  test.beforeAll(async () => {
    grantedPersonalRole = await ensurePersonalRole()
  })

  test.afterAll(async () => {
    if (grantedPersonalRole) await revertPersonalRole()
  })

  test.beforeEach(async ({ page }) => {
    athlete = await linkTestAthlete()
    await cleanCoachTestWorkouts(athlete.id)
    await loginAsAdmin(page)
  })

  test.afterEach(async () => {
    await cleanCoachTestWorkouts(athlete.id)
    await unlinkTestAthlete(athlete.id)
  })

  test('lista de atletas mostra o aluno vinculado e o botão + New workout funciona', async ({ page }) => {
    await page.goto('/athlete/personal')
    await page.waitForLoadState('networkidle')

    const card = page.locator('.bg-card', { hasText: athlete.name })
    await expect(card.first()).toBeVisible({ timeout: 10_000 })

    await card.first().getByRole('button', { name: '+ New workout' }).click()
    await page.waitForURL(/\/athlete\/personal\/new\?a=/, { timeout: 8_000 })
  })

  test('coach cria, edita e apaga um treino prescrito pro aluno', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10)
    const movementName = `[TEST] Movement ${Date.now()}`

    // ── Create ──
    await page.goto(`/athlete/personal/new?a=${athlete.id}&d=${today}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Add section manually' }).click()
    // Scope to the "Add section" sheet — "Strength" also matches an unrelated
    // focus-tag filter chip elsewhere on the page.
    const addSectionSheet = page.locator('div', { has: page.getByText('Add section', { exact: true }) }).last()
    await addSectionSheet.getByRole('button', { name: 'Strength', exact: true }).click()

    await page.getByRole('button', { name: 'Add exercise' }).click()
    await page.getByPlaceholder('Search or type a custom name…').fill(movementName)
    await page.getByRole('button', { name: '+ Create' }).click()

    await page.getByPlaceholder('ex: 3').fill('3')
    await page.getByPlaceholder('ex: 10 ou 21-15-9').fill('10')

    await page.getByRole('button', { name: 'Save workout' }).click()
    await page.waitForURL(url => !url.pathname.startsWith('/athlete/personal/new'), { timeout: 10_000 })

    // ── Shows up in the athlete's history ──
    await page.goto(`/athlete/personal/athlete/${athlete.id}`)
    await page.waitForLoadState('networkidle')
    const card = await expandCardContaining(page, movementName)

    // ── Edit ──
    await card.getByRole('button', { name: 'Edit workout' }).click()
    await page.waitForLoadState('networkidle')
    // Exercise rows load collapsed — expand this one by its movement name
    // before its Sets/Reps fields become interactable.
    await page.getByText(movementName, { exact: true }).click()
    await page.getByPlaceholder('ex: 10 ou 21-15-9').fill('12')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.waitForURL(url => !url.pathname.startsWith('/athlete/personal/new'), { timeout: 10_000 })

    // ── Delete (double confirm: WorkoutCard's inline Yes, then the page's own overlay) ──
    await page.goto(`/athlete/personal/athlete/${athlete.id}`)
    await page.waitForLoadState('networkidle')
    const cardAgain = await expandCardContaining(page, movementName)
    await cardAgain.getByRole('button', { name: 'Delete workout' }).click()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await page.getByRole('button', { name: 'YES, DELETE' }).click()

    await expect(page.getByText(movementName)).not.toBeVisible({ timeout: 8_000 })
  })

})
