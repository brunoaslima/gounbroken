import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { seedQAMovement, cleanQATrainingData } from './helpers/seedTraining'

const MOVEMENT_NAME = '[TEST] Back Squat QA'

test.describe('Build-up — calculadora de aquecimento', () => {

  test.beforeAll(async () => {
    await cleanQATrainingData()
    await seedQAMovement()
  })

  test.afterAll(async () => {
    await cleanQATrainingData()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('selecionar movimento e calcular ladder de aquecimento', async ({ page }) => {
    await page.goto('/athlete/buildup')
    await page.waitForLoadState('networkidle')

    await page.getByText('Select movement', { exact: true }).click()
    await page.getByPlaceholder('Buscar...').fill(MOVEMENT_NAME)
    await page.getByRole('button', { name: MOVEMENT_NAME }).click()

    // Movimento selecionado deve aparecer no header do seletor
    await expect(page.getByText(MOVEMENT_NAME)).toBeVisible()

    await page.getByPlaceholder('0').fill('100')

    // Sets calculados aparecem: barra vazia + sets progressivos até o alvo
    await expect(page.getByText('somente barra')).toBeVisible()
    await expect(page.getByText('100%')).toBeVisible()
    await expect(page.getByText('Enter target weight to calculate build-up')).not.toBeVisible()
  })

  test('peso abaixo do peso da barra mostra erro de validação', async ({ page }) => {
    await page.goto('/athlete/buildup')
    await page.waitForLoadState('networkidle')

    await page.getByText('Select movement', { exact: true }).click()
    await page.getByPlaceholder('Buscar...').fill(MOVEMENT_NAME)
    await page.getByRole('button', { name: MOVEMENT_NAME }).click()

    await page.getByPlaceholder('0').fill('10')

    await expect(page.getByText('Weight must be greater than 20 kg (empty bar)')).toBeVisible()
  })

})
