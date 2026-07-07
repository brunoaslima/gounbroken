import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { seedTodayWorkout, cleanQATodayWorkout } from './helpers/seedWorkouts'

const NOTE_PLACEHOLDER = 'What happened here? Reps done, how it felt...'

// The single test workout auto-expands (MyWorkouts sets
// defaultExpanded={workouts.length === 1}) — only click to expand if it
// isn't already open. Scoped by "Hoje" (today's date badge text) rather than
// a raw Tailwind class, so it targets today's seeded card specifically even
// if other QA fixture workouts (far-future SELF_WORKOUT_DATE etc.) are also
// present on the page.
async function ensureExpanded(page: Page) {
  const noteField = page.getByPlaceholder(NOTE_PLACEHOLDER)
  if (await noteField.isVisible().catch(() => false)) return
  await page.locator('button.w-full.flex.items-start', { hasText: 'Hoje' }).first().click()
  await expect(noteField).toBeVisible()
}

test.describe('Nota por seção — treino do dia', () => {

  test.beforeEach(async () => {
    await cleanQATodayWorkout()
    await seedTodayWorkout()
  })

  test.afterEach(async () => {
    await cleanQATodayWorkout()
  })

  test('atleta escreve uma nota na seção e ela persiste depois de recarregar', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.waitForLoadState('networkidle')
    await ensureExpanded(page)

    const noteField = page.getByPlaceholder(NOTE_PLACEHOLDER)
    await noteField.fill('Fiz 15 reps ao invés de 20, mas terminei bem')
    await noteField.blur()

    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await ensureExpanded(page)

    await expect(page.getByPlaceholder(NOTE_PLACEHOLDER)).toHaveValue('Fiz 15 reps ao invés de 20, mas terminei bem')
  })

  test('nota vira somente leitura depois que o treino é fechado (feedback dado)', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.waitForLoadState('networkidle')
    await ensureExpanded(page)

    const noteField = page.getByPlaceholder(NOTE_PLACEHOLDER)
    await noteField.fill('Bloco tranquilo, sem dor')
    await noteField.blur()
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'I did it' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // O textarea editável sai da tela, mas o texto que já foi escrito continua visível
    await expect(page.getByPlaceholder(NOTE_PLACEHOLDER)).not.toBeVisible()
    await expect(page.getByText('Bloco tranquilo, sem dor')).toBeVisible()
  })

})
