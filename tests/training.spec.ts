import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { seedQAMovement, seedQAScore, cleanQATrainingData } from './helpers/seedTraining'

let movementId: string

test.describe('Training — fluxo de PR', () => {

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

  // ── 1. Usuário vê o movimento de teste na tela de adicionar score ──────────

  test('movimento [TEST] aparece na lista do /add', async ({ page }) => {
    await page.goto(`/add?movement=${movementId}`)
    // O nome do movimento deve aparecer no seletor
    await expect(page.getByText('[TEST] Back Squat QA')).toBeVisible({ timeout: 10_000 })
  })

  // ── 2. Adicionar um score e receber célula de celebração de PR ────────────

  test('adicionar score 1RM → redireciona para detalhe com PR', async ({ page }) => {
    await page.goto(`/add?movement=${movementId}`)
    await page.waitForLoadState('networkidle')

    // Preenche reps = 1
    const repsInput = page.getByLabel(/Reps/i).or(page.getByPlaceholder(/reps/i))
    await repsInput.fill('1')

    // Preenche peso = 100 kg
    const weightInput = page.getByLabel(/Peso|Weight/i).or(page.getByPlaceholder(/kg/i))
    await weightInput.fill('100')

    // Salva
    await page.getByRole('button', { name: /Salvar|SALVAR/i }).click()

    // Deve redirecionar para /movement/:id e exibir celebração de PR
    await page.waitForURL(/\/movement\//, { timeout: 10_000 })
    await expect(page.getByText(/Novo Recorde Pessoal/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('100')).toBeVisible()
  })

  // ── 3. Score anterior mostra o PR registrado ───────────────────────────────

  test('detalhe do movimento exibe o score registrado no histórico', async ({ page }) => {
    // Seed de um score direto no banco para não depender do teste anterior
    await seedQAScore(movementId, 80, 3)

    await page.goto(`/movement/${movementId}`)
    await page.waitForLoadState('networkidle')

    // Score 80 kg × 3 reps deve aparecer no histórico
    await expect(page.getByText('80')).toBeVisible({ timeout: 8_000 })
  })

  // ── 4. Segundo score abaixo do PR não exibe celebração ────────────────────

  test('score abaixo do PR atual não exibe celebração', async ({ page }) => {
    // Seed: PR existente de 120 kg
    await seedQAScore(movementId, 120, 1)

    await page.goto(`/add?movement=${movementId}`)
    await page.waitForLoadState('networkidle')

    const repsInput = page.getByLabel(/Reps/i).or(page.getByPlaceholder(/reps/i))
    await repsInput.fill('1')
    const weightInput = page.getByLabel(/Peso|Weight/i).or(page.getByPlaceholder(/kg/i))
    await weightInput.fill('90') // abaixo do PR de 120

    await page.getByRole('button', { name: /Salvar|SALVAR/i }).click()

    // Não deve mostrar celebração — deve apenas voltar para o histórico
    await page.waitForTimeout(2_000)
    await expect(page.getByText(/Novo Recorde Pessoal/i)).not.toBeVisible()
  })

  // ── 5. My Workouts lista o movimento do QA ────────────────────────────────

  test('My Workouts exibe o movimento de teste', async ({ page }) => {
    await page.goto('/my-workouts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('[TEST] Back Squat QA')).toBeVisible({ timeout: 10_000 })
  })

})
