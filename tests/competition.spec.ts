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
    await page.goto('/athlete/competitions')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('[TEST] Alpha')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('[TEST] Beta')).toBeVisible()
  })

  // ── 2. Painel de gestão — competição A (draft) ─────────────────────────────
  test('abre o painel de gestão da competição A', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/manage`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('[TEST] Alpha')).toBeVisible()
    // StatusPill renders once in the topbar and once in the overview card
    await expect(page.getByText('DRAFT', { exact: true }).first()).toBeVisible()
  })

  // ── 3. Publicar inscrições (draft → open) ──────────────────────────────────
  test('head judge publica inscrições da competição A', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/manage`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'OPEN REGISTRATIONS' }).click()
    await expect(page.getByText('OPEN REGISTRATIONS').first()).toBeVisible({ timeout: 10_000 })
  })

  // ── 4. Criar WOD ──────────────────────────────────────────────────────────
  test('head judge cria um WOD na competição A', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compA}/manage`)
    await page.waitForLoadState('networkidle')

    // Vai para aba WODS
    await page.getByRole('button', { name: /^WODS/ }).click()
    await page.getByRole('button', { name: '+ CREATE WOD' }).click()

    // Preenche o formulário
    await page.getByPlaceholder('Ex: TRIPLET · FOR TIME').fill('[TEST] WOD 01')
    // Score type: FOR TIME já é o default — mantém

    await page.getByRole('button', { name: 'CREATE WOD', exact: true }).click()

    // WOD aparece na lista
    await expect(page.getByText('[TEST] WOD 01')).toBeVisible({ timeout: 8_000 })
  })

  // ── 5. Competição B está aberta ────────────────────────────────────────────
  test('competição B aparece com status OPEN REGISTRATIONS', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compB}/manage`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('OPEN REGISTRATIONS').first()).toBeVisible()
  })

  // ── 6. Cancelar competição — confirmação ───────────────────────────────────
  test('head judge cancela competição B com confirmação', async ({ page }) => {
    await page.goto(`/athlete/competitions/${compB}/manage`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'CANCEL COMPETITION' }).click()

    // Confirmação aparece
    await expect(page.getByText('CANCEL COMPETITION? THIS ACTION CANNOT BE UNDONE.')).toBeVisible()

    // Confirma
    await page.getByRole('button', { name: 'YES, CANCEL' }).click()

    // Status vira CANCELLED
    await expect(page.getByText('CANCELLED').first()).toBeVisible({ timeout: 10_000 })
  })

})
