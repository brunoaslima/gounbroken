import { test, expect } from '@playwright/test'

// ── /onboarding sem sessão ─────────────────────────────────────────────

test.describe('Rota /onboarding sem autenticação', () => {
  test('redireciona para /login quando não há sessão', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── Layout do Onboarding ───────────────────────────────────────────────
// Esses testes verificam a estrutura visual sem precisar de auth real.
// Para testar o fluxo completo, configure TEST_EMAIL e TEST_PASSWORD
// nas variáveis de ambiente e descomente o bloco abaixo.

/*
test.describe('Fluxo completo de onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Faz login com conta de teste
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_EMAIL!)
    await page.getByPlaceholder('••••••••').fill(process.env.TEST_PASSWORD!)
    await page.getByRole('button', { name: /^Entrar$/i }).click()
    // Aguarda redirecionamento para onboarding (conta com onboarding_completed = false)
    await page.waitForURL(/\/onboarding/)
  })

  test('Step 1 — Welcome exibe título e botão continuar', async ({ page }) => {
    await expect(page.getByText(/Cada PR/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar/i })).toBeVisible()
  })

  test('Step 2 — Profile exibe campos de gênero, peso e idade', async ({ page }) => {
    await page.getByRole('button', { name: /Continuar/i }).click()
    await expect(page.getByRole('button', { name: /Masculino/i })).toBeVisible()
    await expect(page.getByPlaceholder('82.5')).toBeVisible()
  })

  test('Pular onboarding vai para o app', async ({ page }) => {
    await page.getByRole('button', { name: /Pular/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('Concluir onboarding vai para o app e não volta', async ({ page }) => {
    // Step 1
    await page.getByRole('button', { name: /Continuar/i }).click()
    // Step 2 — preenche perfil
    await page.getByRole('button', { name: /Masculino/i }).click()
    await page.getByPlaceholder('82.5').fill('80')
    await page.getByPlaceholder('28').fill('25')
    await page.getByRole('button', { name: /Continuar/i }).click()
    // Step 3 — goals (pula seleção)
    await page.getByRole('button', { name: /Continuar/i }).click()
    // Step 4 — first PR (pula)
    await page.getByRole('button', { name: /Pular/i }).click()
    // Step 5 — done
    await page.getByRole('button', { name: /COMEÇAR/i }).click()
    await expect(page).toHaveURL('/')
    // Navegar de volta para /onboarding não deve funcionar
    await page.goto('/onboarding')
    await expect(page).toHaveURL('/')
  })
})
*/
