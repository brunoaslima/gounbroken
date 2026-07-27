import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { getQARoles, setQARoles, deleteQAWorkoutsForDate } from './helpers/seedAIRole'

// 1x1 transparent PNG — content doesn't matter, the edge function call is mocked
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const AI_SCAN_URL = '**/functions/v1/scan-workout-photo'

test.describe('Scan de treino via IA', () => {
  let originalRoles: string[]

  test.beforeAll(async ({}, testInfo) => {
    // Os testes mutam a role da conta QA compartilhada — rodar só num projeto
    // evita que mobile-chrome/mobile-safari corram em paralelo e se pisem.
    test.skip(testInfo.project.name !== 'mobile-chrome', 'roda só uma vez — muta role da conta QA compartilhada')
    originalRoles = await getQARoles()
    await deleteQAWorkoutsForDate(todayISO())
  })

  test.afterAll(async () => {
    await setQARoles(originalRoles)
    await deleteQAWorkoutsForDate(todayISO())
  })

  test('aluno sem role ai/admin não vê o botão "Scan IA"', async ({ page }) => {
    await setQARoles(['user'])
    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.getByTitle('Add workout').click()
    await expect(page.getByText('Scan rápido (offline)').first()).toBeVisible()
    await expect(page.getByText('Scan IA (mais preciso)')).not.toBeVisible()
  })

  test('happy path — foto escaneada por IA cai estruturada no construtor manual e salva', async ({ page }) => {
    await setQARoles(['user', 'ai'])

    await page.route(AI_SCAN_URL, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sections: [
            {
              section_type: 'wod',
              label: 'WOD',
              position: 0,
              format_type: 'AMRAP',
              format_config: { time_minutes: 12 },
              notes: null,
              exercises: [
                { movement_name: 'Burpee', sets: null, reps: 10, reps_label: null, duration_seconds: null, load_kg: null, load_kg_to: null, load_pct_1rm: null, load_pct_1rm_to: null, rpe: null, rest_seconds: null, notes: null, position: 0 },
              ],
            },
          ],
        }),
      })
    })

    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.getByTitle('Add workout').click()

    await expect(page.getByText('Scan IA (mais preciso)')).toBeVisible()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText('Scan IA (mais preciso)').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'workout.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
    })

    // Cai no construtor manual (mesma tela de review de hoje), pré-preenchido
    await expect(page.getByText('Write manually')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('WOD')).toBeVisible()
    await expect(page.getByText(/Burpee/)).toBeVisible()

    await page.getByRole('button', { name: 'Save workout' }).click()
    await expect(page.getByText('Write manually')).not.toBeVisible({ timeout: 10_000 })
  })

  test('foto sem treino legível — mostra erro e mantém as outras opções disponíveis', async ({ page }) => {
    await setQARoles(['user', 'ai'])

    await page.route(AI_SCAN_URL, route => {
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not_a_workout' }),
      })
    })

    await loginAsAdmin(page)
    await page.goto('/athlete/my-workouts')
    await page.getByTitle('Add workout').click()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText('Scan IA (mais preciso)').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'not-a-workout.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
    })

    await expect(page.getByText(/Não foi possível identificar um treino/)).toBeVisible({ timeout: 10_000 })
    // Volta pro menu — as outras opções continuam disponíveis
    await expect(page.getByText('Scan rápido (offline)').first()).toBeVisible()
    await expect(page.getByText('Type manually')).toBeVisible()
  })
})
