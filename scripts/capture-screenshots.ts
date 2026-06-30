/**
 * capture-screenshots.ts
 * Playwright script to capture screenshots of all CF Scores screens.
 * Usage: npx playwright test scripts/capture-screenshots.ts --headed
 * Or run via: npx tsx scripts/capture-screenshots.ts
 *
 * Saves PNGs to screenshots/ folder in the project root.
 */

import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'https://cf-scores.vercel.app'
const EMAIL = 'brunoaslima'
const PASSWORD = 'Brun0@sl'

const OUT_DIR = path.join(process.cwd(), 'screenshots')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR)

async function save(page: any, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  saved: ${file}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await ctx.newPage()

  // ── 01 · Login screen ────────────────────────────────────────────────────
  console.log('01 · Login')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await save(page, '01-login')

  // ── 02 · Criar conta tab ─────────────────────────────────────────────────
  console.log('02 · Criar conta')
  await page.getByRole('button', { name: /criar conta/i }).click()
  await page.waitForTimeout(400)
  await save(page, '02-criar-conta')

  // ── Log in ───────────────────────────────────────────────────────────────
  console.log('   Logging in…')
  // Click the "Entrar" tab (first button) to switch back to login tab
  await page.locator('button[type="button"]', { hasText: /^entrar$/i }).click()
  await page.waitForTimeout(300)
  const emailInput = page.getByPlaceholder('email@dominio.com ou username')
  await emailInput.fill(EMAIL)
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  await page.waitForTimeout(1500)

  // ── 03 · Dashboard (top) ─────────────────────────────────────────────────
  console.log('03 · Dashboard')
  await save(page, '03-dashboard-top')

  // scroll mid
  await page.evaluate(() => window.scrollBy(0, 300))
  await page.waitForTimeout(400)
  await save(page, '04-dashboard-mid')

  // scroll bottom
  await page.evaluate(() => window.scrollBy(0, 600))
  await page.waitForTimeout(400)
  await save(page, '05-dashboard-bottom')

  // ── 06 · Add Score ────────────────────────────────────────────────────────
  console.log('06 · Add Score')
  await page.goto(`${BASE_URL}/add`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await save(page, '06-add-score')

  // open movement picker
  await page.locator('text=Selecionar').first().click()
  await page.waitForTimeout(600)
  await save(page, '07-movement-picker')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // ── 08 · Stats ────────────────────────────────────────────────────────────
  console.log('08 · Stats')
  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await save(page, '08-stats-top')

  await page.evaluate(() => window.scrollBy(0, 400))
  await page.waitForTimeout(400)
  await save(page, '09-stats-mid')

  // ── 10 · Profile ─────────────────────────────────────────────────────────
  console.log('10 · Profile')
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await save(page, '10-profile')

  // ── 11 · Treinos (workouts list) ─────────────────────────────────────────
  console.log('11 · Treinos')
  await page.goto(`${BASE_URL}/my-workouts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await save(page, '11-treinos')

  // ── 12 · Personal (trainer panel) ────────────────────────────────────────
  console.log('12 · Personal')
  await page.goto(`${BASE_URL}/personal`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await save(page, '12-personal')

  // ── 13 · Movement Detail ─────────────────────────────────────────────────
  console.log('13 · Movement Detail')
  await page.goto(`${BASE_URL}/movement/1870214b-b0cd-47b4-b810-aea19a10b084`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await save(page, '13-movement-detail-top')
  await page.evaluate(() => window.scrollBy(0, 350))
  await page.waitForTimeout(400)
  await save(page, '14-movement-detail-history')

  // ── 15 · Admin (access restricted) ───────────────────────────────────────
  console.log('15 · Admin')
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await save(page, '15-admin')

  await browser.close()

  console.log(`\nDone! ${fs.readdirSync(OUT_DIR).length} screenshots in: ${OUT_DIR}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
