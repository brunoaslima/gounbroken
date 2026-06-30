import { defineConfig, devices } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Carrega variáveis de ambiente para os testes (nunca comitar .env.test.local)
function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
}
// .env.local tem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
// .env.test.local tem TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_SERVICE_ROLE_KEY
loadEnvFile(resolve(__dirname, '.env.local'))
loadEnvFile(resolve(__dirname, '.env.test.local'))

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Aponta para o servidor local de dev
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Simula iPhone 14 (público-alvo do app)
    ...devices['iPhone 14'],
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  // Sobe o servidor de dev automaticamente antes dos testes
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
