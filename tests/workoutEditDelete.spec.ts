import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import {
  cleanQAWorkouts,
  seedSelfWorkout,
  seedCoachWorkout,
  SELF_SECTION_CONTENT,
} from './helpers/seedWorkouts'

test.describe('MyWorkouts — editar/apagar treino auto-criado', () => {

  test.beforeEach(async ({ page }) => {
    await cleanQAWorkouts()
    await seedSelfWorkout()
    await seedCoachWorkout()
    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await cleanQAWorkouts()
  })

  test('só o treino auto-criado mostra editar/apagar — o do coach não', async ({ page }) => {
    // Exactly one of each — proves the coach-prescribed workout doesn't
    // expose these actions, only the self-created one does.
    await expect(page.getByRole('button', { name: 'Edit workout' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Delete workout' })).toHaveCount(1)
  })

  test('editar treino auto-criado abre o sheet pré-preenchido', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit workout' }).click()

    await expect(page.getByText('Edit workout')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(SELF_SECTION_CONTENT)).toBeVisible()
  })

  test('apagar treino auto-criado remove o card', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete workout' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()

    await expect(page.getByRole('button', { name: 'Delete workout' })).toHaveCount(0, { timeout: 8_000 })
    // The coach-prescribed workout must still be there, untouched
    await expect(page.getByText('2035', { exact: false })).toBeVisible()
  })

})
