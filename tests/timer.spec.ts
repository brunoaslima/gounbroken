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
