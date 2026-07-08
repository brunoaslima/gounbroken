import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Timer', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('trocar o tipo de timer atualiza a tela de configuração', async ({ page }) => {
    await page.goto('/athlete/timer')
    await page.waitForLoadState('networkidle')

    // FOR TIME é o modo padrão
    await expect(page.getByText('Time Cap')).toBeVisible()

    await page.getByRole('button', { name: 'EMOM' }).click()
    await expect(page.getByText('Interval', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'TABATA' }).click()
    await expect(page.getByText('Work 20s · Rest 10s · Fixed')).toBeVisible()

    await page.getByRole('button', { name: 'STOPWATCH' }).click()
    await expect(page.getByText('No configuration needed. Press start.')).toBeVisible()
  })

  test('EMOM/Interval: configura intervalo customizado, verifica Total e permite rest=0', async ({ page }) => {
    await page.goto('/athlete/timer')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'EMOM' }).click()
    await expect(page.getByText('Interval', { exact: true })).toBeVisible()

    // Intervalo parte de 60s (60s < 30s? não — troca pra EMOM força mínimo de 60s) — +30s → 90s
    const intervalBox = page.getByText('Interval', { exact: true }).locator('xpath=..')
    await intervalBox.getByRole('button', { name: '+30s' }).click()

    // Rounds parte de 8 (default) — 3x "−1" → 5
    const roundsBox = page.getByText('Rounds', { exact: true }).locator('xpath=..')
    const roundsMinus = roundsBox.getByRole('button', { name: '−' })
    await roundsMinus.click()
    await roundsMinus.click()
    await roundsMinus.click()

    // Verificar que o Total calculado aparece (5 rounds × 90s = 450s = 7:30)
    await expect(page.getByText(/Total:?\s*7:30/i)).toBeVisible()

    // Testar rest = 0 (Interval timer deve aceitar rest zerado sem travar)
    await page.getByRole('button', { name: 'INTERVAL' }).click()
    const restBox = page.getByText('Rest Time', { exact: true }).locator('xpath=..')
    const restMinus = restBox.getByRole('button', { name: '−' })
    await restMinus.click() // 10s → 5s
    await restMinus.click() // 5s → 0s (clamped ao min)
    await expect(restBox.getByText('00:00')).toBeVisible()
  })

  test('stopwatch: start → pause → resume → reset', async ({ page }) => {
    await page.goto('/athlete/timer')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'STOPWATCH' }).click()
    await page.getByRole('button', { name: 'START →' }).click()

    // Contagem regressiva de 3s antes do timer rodar
    await expect(page.getByText('GET READY')).toBeVisible()
    await expect(page.getByText('● RUNNING')).toBeVisible({ timeout: 6_000 })

    await page.getByRole('button', { name: 'PAUSE', exact: true }).click()
    await expect(page.getByText('❚❚ PAUSED')).toBeVisible()

    await page.getByRole('button', { name: 'RESUME', exact: true }).click()
    await expect(page.getByText('● RUNNING')).toBeVisible()

    await page.getByRole('button', { name: 'RESET', exact: true }).click()

    // Volta pra tela de configuração
    await expect(page.getByRole('button', { name: 'START →' })).toBeVisible()
  })

})
