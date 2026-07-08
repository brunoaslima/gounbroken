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

    // Ajustar intervalo para 90s
    const intervalInput = page.locator('input[type="number"]').first()
    await intervalInput.fill('90')

    // Ajustar rounds para 5
    const roundsInput = page.locator('input[type="number"]').nth(1)
    await roundsInput.fill('5')

    // Verificar que o Total calculado aparece (5 rounds × 90s = 450s = 7:30)
    await expect(page.getByText(/Total:?\s*7:30/i)).toBeVisible()

    // Testar rest = 0 (o campo Rest deve aceitar 0 sem erro)
    await page.getByRole('button', { name: 'INTERVAL' }).click()
    await expect(page.getByText('Rest', { exact: true })).toBeVisible()
    const restInput = page.locator('input[type="number"]').nth(2)
    await restInput.fill('0')
    // Se rest=0, o timer deve funcionar sem fase de rest (não trava)
    await expect(restInput).toHaveValue('0')
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
