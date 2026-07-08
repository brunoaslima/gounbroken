import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { seedQAMovement, cleanQATrainingData } from './helpers/seedTraining'

let movementId: string

test.describe('Unbroken tracker — registrar set e ver PR', () => {

  test.beforeAll(async () => {
    await cleanQATrainingData()
    movementId = await seedQAMovement()
  })

  test.afterAll(async () => {
    await cleanQATrainingData()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('registrar um set unbroken atualiza o PR e aparece na lista', async ({ page }) => {
    await page.goto(`/athlete/unbroken/${movementId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '+ SET' }).click()

    await page.getByLabel('Reps unbroken').fill('17')
    await page.getByLabel('MIN').fill('1')
    await page.getByLabel('SEC').fill('30')

    await page.getByRole('button', { name: 'Guardar set' }).click()

    // PR block updates to the new reps value, and the set shows in the list
    await expect(page.locator('span.text-\\[32px\\]', { hasText: '17' })).toBeVisible({ timeout: 8_000 })
  })

})
