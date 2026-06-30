import { test, expect } from '@playwright/test'
import { cleanTestCompetitions, seedTestCompetitions } from './helpers/seed'
import { loginAsAdmin } from './helpers/auth'

// IDs criados pelo seed — compartilhados entre os testes do suite
let compA: string
let compB: string

test.describe('Competition module', () => {

  test.beforeAll(async () => {
    await cleanTestCompetitions()
    const ids = await seedTestCompetitions()
    compA = ids.compA
    compB = ids.compB
  })

  test.afterAll(async () => {
    await cleanTestCompetitions()
  })

  // ── Setup de sessão (login uma vez, reutiliza nos demais) ──────────────────
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  // ── 1. Lista de competições ────────────────────────────────────────────────
  test('lista mostra as 2 competições de teste', async ({ page }) => {
    await page.goto('/competitions')
    await expect(page.getByText('[TEST] Alpha')).toBeVisible()
    await expect(page.getByText('[TEST] Beta')).toBeVisible()
  })

  // ── 2. Painel de gestão — competição A (draft) ─────────────────────────────
  test('abre o painel de gestão da competição A', async ({ page }) => {
    await page.goto(`/competitions/${compA}/manage`)
    await expect(page.getByText('[TEST] Alpha')).toBeVisible()
    // Status pill
    await expect(page.getByText('RASCUNHO')).toBeVisible()
  })

  // ── 3. Publicar inscrições (draft → open) ──────────────────────────────────
  test('head judge publica inscrições da competição A', async ({ page }) => {
    await page.goto(`/competitions/${compA}/manage`)
    await page.getByRole('button', { name: /PUBLICAR INSCRIÇÕES/i }).click()
    await expect(page.getByText('INSCRIÇÕES ABERTAS')).toBeVisible({ timeout: 10_000 })
  })

  // ── 4. Criar WOD ──────────────────────────────────────────────────────────
  test('head judge cria um WOD na competição A', async ({ page }) => {
    await page.goto(`/competitions/${compA}/manage`)

    // Vai para aba WODS
    await page.getByRole('button', { name: /^WODS/i }).click()
    await page.getByRole('button', { name: /\+ CRIAR WOD/i }).click()

    // Preenche o formulário
    await page.getByPlaceholder(/TRIPLET/i).fill('[TEST] WOD 01')
    // Score type: FOR TIME já é o default — mantém

    await page.getByRole('button', { name: /CRIAR WOD/i }).last().click()

    // WOD aparece na lista
    await expect(page.getByText('[TEST] WOD 01')).toBeVisible({ timeout: 8_000 })
  })

  // ── 5. Competição B está aberta ────────────────────────────────────────────
  test('competição B aparece com status INSCRIÇÕES ABERTAS', async ({ page }) => {
    await page.goto(`/competitions/${compB}/manage`)
    await expect(page.getByText('INSCRIÇÕES ABERTAS')).toBeVisible()
  })

  // ── 6. Cancelar competição — confirmação ───────────────────────────────────
  test('head judge cancela competição B com confirmação', async ({ page }) => {
    await page.goto(`/competitions/${compB}/manage`)

    await page.getByRole('button', { name: /CANCELAR COMPETIÇÃO/i }).click()

    // Confirmação aparece
    await expect(page.getByText(/SIM, CANCELAR/i)).toBeVisible()

    // Confirma
    await page.getByRole('button', { name: /SIM, CANCELAR/i }).click()

    // Status vira CANCELADA
    await expect(page.getByText('CANCELADA')).toBeVisible({ timeout: 10_000 })
  })

})
