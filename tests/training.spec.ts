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

  test('movimento [TEST] aparece na tela de adicionar score', async ({ page }) => {
    await page.goto(`/athlete/add?movement=${movementId}`)
    // O nome do movimento deve aparecer no topo do formulário de PR
    await expect(page.getByText('[TEST] Back Squat QA')).toBeVisible({ timeout: 10_000 })
  })

  // ── 2. Adicionar um score e receber célula de celebração de PR ────────────

  test('adicionar score 1RM → redireciona para detalhe com PR', async ({ page }) => {
    await page.goto(`/athlete/add?movement=${movementId}`)
    await page.waitForLoadState('networkidle')

    // Reps já vem com 1 selecionado por padrão — só precisa do peso
    const weightInput = page.getByPlaceholder('0')
    await weightInput.fill('100')

    await page.getByRole('button', { name: 'Save PR' }).click()

    // Deve redirecionar para /athlete/movement/:id e exibir celebração de PR
    await page.waitForURL(/\/athlete\/movement\//, { timeout: 10_000 })
    await expect(page.getByText('New Personal Record')).toBeVisible({ timeout: 8_000 })
    // Peso da celebração renderiza em span próprio (52px, lime) — escopar por essa classe evita colidir com outros "100" na tela
    await expect(page.locator('span.text-\\[52px\\]', { hasText: '100' })).toBeVisible()
  })

  // ── 3. Score anterior mostra o PR registrado ───────────────────────────────

  test('detalhe do movimento exibe o score registrado no histórico', async ({ page }) => {
    // Seed de um score direto no banco para não depender do teste anterior
    await seedQAScore(movementId, 80, 3)

    await page.goto(`/athlete/movement/${movementId}`)
    await page.waitForLoadState('networkidle')

    // Score 80 kg × 3 reps deve aparecer na linha do histórico (18px) — o número "80" também
    // aparece no header (56px) e em labels do gráfico (20px), por isso escopamos pela classe
    await expect(page.locator('span.text-\\[18px\\]', { hasText: '80' })).toBeVisible({ timeout: 8_000 })
  })

  // ── 4. Segundo score abaixo do PR não exibe celebração ────────────────────

  test('score abaixo do PR atual não exibe celebração', async ({ page }) => {
    // Seed: PR existente de 120 kg
    await seedQAScore(movementId, 120, 1)

    await page.goto(`/athlete/add?movement=${movementId}`)
    await page.waitForLoadState('networkidle')

    const weightInput = page.getByPlaceholder('0')
    await weightInput.fill('90') // abaixo do PR de 120

    await page.getByRole('button', { name: 'Save PR' }).click()

    // Não deve mostrar celebração — deve apenas voltar para o histórico
    await page.waitForTimeout(2_000)
    await expect(page.getByText('New Personal Record')).not.toBeVisible()
  })

})
