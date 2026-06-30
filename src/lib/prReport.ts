import { analyzeStrength } from './strengthStandards'

const EN_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const EN_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December']

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say' | null | undefined

export interface RawScore {
  movement_id: string
  reps: number
  weight_kg: number
  recorded_at: string
}

export interface RawMovement {
  id: string
  name: string
}

interface RMRecord { reps: number; weight: number; date: string }
interface ChartPoint { date: string; weight: number; rawDate: string }

interface MovementPRData {
  id: string
  name: string
  principal: RMRecord
  also: RMRecord[]
  tierLabel: string | null
  tierColor: string
  percentile: number | null
  bodyWeightRatio: number | null
  progression: ChartPoint[]
  delta: number | null
  sortScore: number
}

export interface PRPosterData {
  athleteName: string
  username: string | null
  generatedAt: string
  totalMovements: number
  hero: MovementPRData
  others: MovementPRData[]
  topTierLabel: string
  topTierColor: string
}

export function fmtDate(s: string): string {
  const [, mm, dd] = s.split('-')
  return `${dd} ${EN_SHORT[+mm - 1]}`
}

export function fmtChartDate(s: string): string {
  const [yyyy, mm] = s.split('-')
  return `${EN_SHORT[+mm - 1]}/${yyyy.slice(2)}`
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildPRPosterData(
  movements: RawMovement[],
  scores: RawScore[],
  bodyWeightKg: number | null | undefined,
  gender: Gender,
  athleteName: string,
  username: string | null,
): PRPosterData | null {
  // Max weight per movement per reps
  const prMap: Record<string, Record<number, number>> = {}
  for (const s of scores) {
    if (!prMap[s.movement_id]) prMap[s.movement_id] = {}
    const cur = prMap[s.movement_id][s.reps] ?? 0
    if (s.weight_kg > cur) prMap[s.movement_id][s.reps] = s.weight_kg
  }

  // Most recent date for each PR occurrence
  const dateMap: Record<string, Record<number, string>> = {}
  for (const s of scores) {
    const pr = prMap[s.movement_id]?.[s.reps]
    if (s.weight_kg === pr) {
      if (!dateMap[s.movement_id]) dateMap[s.movement_id] = {}
      const ex = dateMap[s.movement_id][s.reps]
      if (!ex || s.recorded_at > ex) dateMap[s.movement_id][s.reps] = s.recorded_at
    }
  }

  // Historical 1RM: max per calendar day, sorted ascending
  const hist1: Record<string, Record<string, number>> = {}
  for (const s of scores) {
    if (s.reps !== 1) continue
    if (!hist1[s.movement_id]) hist1[s.movement_id] = {}
    const cur = hist1[s.movement_id][s.recorded_at] ?? 0
    if (s.weight_kg > cur) hist1[s.movement_id][s.recorded_at] = s.weight_kg
  }

  const movementsWithPRs = movements.filter(m => Object.keys(prMap[m.id] ?? {}).length > 0)
  if (!movementsWithPRs.length) return null

  const bw = bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : null
  const g  = gender === 'male' || gender === 'female' ? gender : null

  const allData: MovementPRData[] = movementsWithPRs.map(m => {
    const prs   = prMap[m.id]
    const dates = dateMap[m.id] ?? {}
    const reps  = Object.keys(prs).map(Number).sort((a, b) => a - b)
    const principalReps = reps[0]

    const also: RMRecord[] = reps.slice(1).map(r => ({
      reps: r, weight: prs[r], date: dates[r] ? fmtDate(dates[r]) : '—',
    }))

    // Strength analysis only valid on 1RM with known bodyweight + binary gender
    let tierLabel: string | null = null
    let tierColor = '#6B6B68'
    let percentile: number | null = null
    let bodyWeightRatio: number | null = null
    let sortScore = 0

    if (bw && g && prs[1]) {
      const analysis = analyzeStrength(m.name, prs[1], bw, g)
      if (analysis) {
        tierLabel = analysis.levelLabel
        tierColor = analysis.levelColor
        percentile = Math.round(100 - analysis.score)
        bodyWeightRatio = Math.round(analysis.bodyWeightRatio * 10) / 10
        sortScore = analysis.score
      }
    }

    // Fallback sort: bodyweight ratio or absolute weight
    if (sortScore === 0) {
      const w = prs[principalReps]
      sortScore = bw ? (w / bw) * 30 : w / 10
    }

    // Progression chart: up to 7 most recent 1RM data points
    const dayMap = hist1[m.id] ?? {}
    const progEntries = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
    const progression: ChartPoint[] = progEntries.map(([date, weight]) => ({
      date: fmtChartDate(date), weight, rawDate: date,
    }))

    let delta: number | null = null
    if (progEntries.length >= 2) {
      const cur  = progEntries[progEntries.length - 1][1]
      const prev = progEntries[progEntries.length - 2][1]
      delta = Math.round((cur - prev) * 10) / 10
    }

    return {
      id: m.id, name: m.name,
      principal: { reps: principalReps, weight: prs[principalReps], date: dates[principalReps] ? fmtDate(dates[principalReps]) : '—' },
      also, tierLabel, tierColor, percentile, bodyWeightRatio, progression, delta, sortScore,
    }
  })

  allData.sort((a, b) => b.sortScore - a.sortScore)

  const totalMovements = allData.length
  const hero   = allData[0]
  const others = allData.slice(1)

  const topTierLabel = hero.tierLabel ?? 'PR'
  const topTierColor = hero.tierLabel ? hero.tierColor : '#D4FF3A'

  const now = new Date()
  return {
    athleteName, username,
    generatedAt: `${EN_FULL[now.getMonth()]} ${now.getFullYear()}`,
    totalMovements,
    hero, others,
    topTierLabel, topTierColor,
  }
}

export function buildPRPosterHTML(data: PRPosterData): string {
  const { hero, others, athleteName, username, generatedAt, totalMovements, topTierLabel, topTierColor } = data

  function buildChart(prog: ChartPoint[]): string {
    if (prog.length < 2) return ''
    const n = prog.length
    const weights = prog.map(p => p.weight)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const wRange = maxW - minW || 1

    const pts = prog.map((p, i) => ({
      x: 6 + 360 * i / (n - 1),
      y: 162 - ((p.weight - minW) / wRange) * 144,
      p,
    }))

    const polyPts  = pts.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const fillPts  = polyPts + ` ${pts[n-1].x.toFixed(1)},162 ${pts[0].x.toFixed(1)},162`
    const totalGain = Math.round((weights[n-1] - weights[0]) * 10) / 10
    const gainStr   = totalGain > 0 ? `+${totalGain}` : `${totalGain}`

    const [y1, m1] = prog[0].rawDate.split('-').map(Number)
    const [y2, m2] = prog[n-1].rawDate.split('-').map(Number)
    const months = (y2 - y1) * 12 + (m2 - m1)
    const periodStr = months <= 1 ? '1 month' : `${months} months`

    // Show first, middle (if n>3), last labels
    const labelIdxs = n > 3 ? [0, Math.floor(n / 2), n - 1] : [0, n - 1]
    const labelHtml = labelIdxs.map(i =>
      `<span>${weights[i]} · ${prog[i].date}</span>`
    ).join('')

    const circles = pts.map(({ x, y }, i) => i === n - 1
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#0A0A0A"></circle><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#D4FF3A"></circle>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#0A0A0A"></circle>`
    ).join('')

    return `
      <div style="flex:0 0 372px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(10,10,10,0.62);display:inline-flex;align-items:center;gap:7px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="square"><path d="M3 17l6-6 4 4 8-8"></path><path d="M16 7h5v5"></path></svg>
            Progression · ${periodStr}
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:800;letter-spacing:0.02em;color:#0A0A0A;">${gainStr} KG</span>
        </div>
        <svg width="372" height="172" viewBox="0 0 372 172" style="display:block;">
          <line x1="6" y1="162" x2="366" y2="162" stroke="rgba(10,10,10,0.18)" stroke-width="1"></line>
          <polygon points="${fillPts}" fill="rgba(10,10,10,0.07)"></polygon>
          <polyline points="${polyPts}" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="square"></polyline>
          ${circles}
        </svg>
        <div style="display:flex;justify-content:space-between;margin-top:7px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.08em;color:rgba(10,10,10,0.55);">
          ${labelHtml}
        </div>
      </div>`
  }

  const heroHasChart = hero.progression.length >= 2
  const heroHasAlso  = hero.also.length > 0
  const heroAlsoMax4 = hero.also.slice(0, 4)

  const tierBadge = hero.tierLabel && hero.percentile !== null
    ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;border:1.5px solid #0A0A0A;color:#0A0A0A;padding:5px 10px;display:inline-flex;align-items:center;gap:6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="square"><path d="M5 21V4M5 4h13l-3 4 3 4H5"></path></svg>
        ${esc(hero.tierLabel.toUpperCase())} · TOP ${hero.percentile}%
      </span>`
    : ''

  const heroMetaParts: string[] = []
  if (hero.delta !== null && hero.delta !== 0)
    heroMetaParts.push(`${hero.delta > 0 ? '+' : ''}${hero.delta} KG VS ANTERIOR`)
  if (hero.bodyWeightRatio !== null)
    heroMetaParts.push(`${hero.bodyWeightRatio}× BODYWEIGHT`)
  const heroMeta = heroMetaParts.join(' · ')

  const heroAlsoHTML = heroHasAlso ? `
    <div style="margin-top:22px;border-top:1.5px solid rgba(10,10,10,0.18);padding-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(10,10,10,0.62);">+${hero.also.length} ${hero.also.length === 1 ? 'record' : 'records'} in this movement</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(10,10,10,0.42);">${hero.principal.reps}RM featured above</span>
      </div>
      <div style="display:flex;gap:10px;">
        ${heroAlsoMax4.map(rm => `
          <div style="flex:1;display:flex;align-items:center;gap:14px;border:1.5px solid rgba(10,10,10,0.24);padding:11px 16px;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;letter-spacing:0.04em;color:#0A0A0A;border-right:1.5px solid rgba(10,10,10,0.2);padding-right:14px;">${rm.reps}RM</span>
            <div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:25px;font-weight:800;line-height:1;color:#0A0A0A;font-variant-numeric:tabular-nums;">${rm.weight}<span style="font-size:12px;font-weight:600;color:rgba(10,10,10,0.5);margin-left:3px;">KG</span></div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.08em;color:rgba(10,10,10,0.52);margin-top:4px;">${rm.date}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''

  const othersCount = others.length
  const otherRowsHTML = others.map((m, idx) => {
    const is1RM = m.principal.reps === 1
    const badgeStyle = is1RM
      ? 'border:1px solid #2A2A2A;color:#A8A8A4;background:transparent;'
      : 'border:1px solid #3D3D3B;background:#1F1F1F;color:#F5F5F0;'
    const isLast = idx === others.length - 1

    const tierLine = m.tierLabel && m.percentile !== null
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;margin-top:6px;">${esc(m.tierLabel)} · top ${m.percentile}%</div>`
      : ''

    const alsoLine = m.also.length > 0
      ? `<div style="margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#6B6B68;">Also · ${m.also.map(r => `${r.reps}RM <span style="color:#A8A8A4;">${r.weight}</span>`).join(' · ')}</div>`
      : ''

    return `
      <div style="display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:8px;border-top:1px solid #2A2A2A;${isLast ? 'border-bottom:1px solid #2A2A2A;' : ''}padding:16px 0;break-inside:avoid;page-break-inside:avoid;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:800;color:${m.tierColor};">${String(idx + 2).padStart(2, '0')}</div>
        <div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:34px;font-weight:700;letter-spacing:-0.02em;color:#F5F5F0;">${esc(m.name)}</div>
          ${tierLine}${alsoLine}
        </div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:12px;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:5px 9px;line-height:1;white-space:nowrap;${badgeStyle}">${m.principal.reps}RM</span>
          <div style="font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;">
            <span style="font-size:56px;font-weight:800;letter-spacing:-0.01em;color:#F5F5F0;">${m.principal.weight}</span>
            <span style="font-size:16px;font-weight:500;color:#6B6B68;margin-left:6px;">KG</span>
          </div>
        </div>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My PRs · GO UNBROKEN</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #0A0A0A; }
@page { size: 1080px 1488px; margin: 0; }
@page :left { margin-top: 54px; }
@page :right { margin-top: 54px; }
@page :first { margin: 0; }
@media print { *, *::before, *::after { transition-duration: 0s !important; animation: none !important; } }
</style>
</head>
<body>
<div style="position:relative;flex-shrink:0;width:1080px;min-height:1488px;background:#0A0A0A;border:1px solid #2A2A2A;padding:54px 56px 42px;display:flex;flex-direction:column;font-family:'Space Grotesk','Helvetica Neue',sans-serif;">

  <span style="position:absolute;top:18px;left:18px;width:12px;height:12px;background:linear-gradient(#3D3D3B,#3D3D3B) center/12px 1.5px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/1.5px 12px no-repeat;"></span>
  <span style="position:absolute;top:18px;right:18px;width:12px;height:12px;background:linear-gradient(#D4FF3A,#D4FF3A) center/12px 1.5px no-repeat,linear-gradient(#D4FF3A,#D4FF3A) center/1.5px 12px no-repeat;"></span>
  <span style="position:absolute;bottom:18px;left:18px;width:12px;height:12px;background:linear-gradient(#3D3D3B,#3D3D3B) center/12px 1.5px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/1.5px 12px no-repeat;"></span>
  <span style="position:absolute;bottom:18px;right:18px;width:12px;height:12px;background:linear-gradient(#3D3D3B,#3D3D3B) center/12px 1.5px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/1.5px 12px no-repeat;"></span>
  <div style="position:absolute;top:150px;bottom:120px;left:28px;width:9px;background:repeating-linear-gradient(180deg,#2A2A2A 0 1.5px,transparent 1.5px 22px);"></div>

  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:12px;">
      <svg viewBox="0 0 240 240" width="40" height="40" style="display:block;"><rect width="240" height="240" fill="#D4FF3A"></rect><g transform="translate(40 64)" fill="#0A0A0A"><path d="M0 0 H68 V18 H20 V46 H46 V32 H36 V18 H68 V112 H0 Z"></path></g><rect x="24" y="116" width="192" height="6" fill="#0A0A0A"></rect><g transform="translate(132 64)" fill="#0A0A0A"><path d="M0 0 H20 V90 H48 V0 H68 V112 H0 Z"></path></g></svg>
      <div style="display:flex;align-items:center;gap:8px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px;letter-spacing:-0.02em;color:#F5F5F0;">GO<span style="width:18px;height:5px;background:#D4FF3A;display:inline-block;"></span>UNBROKEN</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;letter-spacing:-0.01em;color:#F5F5F0;">${esc(athleteName)}</div>
      ${username ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.04em;color:#6B6B68;margin-top:2px;">@${esc(username)}</div>` : ''}
    </div>
  </div>
  <div style="height:1px;background:#2A2A2A;margin:18px 0 30px;"></div>

  <div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6B6B68;margin-bottom:12px;">PR Report · ${totalMovements} ${totalMovements === 1 ? 'movement' : 'movements'} · ${generatedAt} · kg</div>
    <div style="font-family:'Space Grotesk',sans-serif;font-size:84px;font-weight:700;letter-spacing:-0.04em;line-height:0.88;color:#F5F5F0;">My</div>
    <div style="display:flex;align-items:center;gap:18px;">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:84px;font-weight:700;letter-spacing:-0.04em;line-height:0.88;color:#F5F5F0;">Records</div>
      <span style="width:52px;height:8px;background:#D4FF3A;display:inline-block;margin-bottom:12px;"></span>
    </div>
  </div>

  <div style="margin-top:26px;background:#D4FF3A;color:#0A0A0A;padding:30px 34px;position:relative;display:flex;flex-direction:column;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:#0A0A0A;letter-spacing:0.02em;">01</span>
        <span style="width:1.5px;height:16px;background:rgba(10,10,10,0.25);display:inline-block;"></span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="square"><path d="M3 12h18"></path><path d="M5 8v8M8 6v12M16 6v12M19 8v8"></path></svg>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(10,10,10,0.62);">Top PR</span>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;background:#0A0A0A;color:#D4FF3A;padding:6px 10px;">PR</span>
        ${tierBadge}
      </div>
    </div>

    <div style="display:flex;gap:34px;margin-top:22px;align-items:flex-end;">
      <div style="flex:1;">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:34px;font-weight:700;letter-spacing:-0.02em;color:#0A0A0A;line-height:1;">${esc(hero.name)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(10,10,10,0.55);margin-top:7px;">${hero.principal.reps}RM · ${hero.principal.date}</div>
        <div style="display:flex;align-items:baseline;margin-top:10px;">
          <span style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:118px;line-height:0.84;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:#0A0A0A;">${hero.principal.weight}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:32px;letter-spacing:0.04em;color:rgba(10,10,10,0.6);margin-left:8px;">KG</span>
        </div>
        ${heroMeta ? `<div style="display:flex;gap:14px;margin-top:18px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.05em;color:rgba(10,10,10,0.74);"><span>${heroMeta}</span></div>` : ''}
      </div>
      ${heroHasChart ? buildChart(hero.progression) : ''}
    </div>
    ${heroAlsoHTML}
  </div>

  ${othersCount > 0 ? `
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:26px 0 0;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;">Other Records · ${othersCount} ${othersCount === 1 ? 'movement' : 'movements'}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;">rep type next to weight</span>
  </div>
  <div>${otherRowsHTML}</div>` : ''}

  <div style="margin-top:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;">Strength scale · global percentile</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;">you → <span style="color:${topTierColor};">${esc(topTierLabel)}</span></span>
    </div>
    <div style="display:flex;height:7px;gap:2px;">
      <div style="flex:1;background:#6B6B68;"></div>
      <div style="flex:1;background:#A8A8A4;"></div>
      <div style="flex:1;background:#4DA3FF;"></div>
      <div style="flex:1;background:#D4FF3A;"></div>
      <div style="flex:1.4;background:#FF8A00;"></div>
      <div style="flex:1;background:#FF3B30;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B6B68;">
      <span>Untrained</span><span>Beginner</span><span>Interm.</span><span>Advanced</span><span style="color:#FF8A00;">Elite</span><span>World</span>
    </div>
  </div>

  <div style="margin-top:auto;padding-top:22px;">
    <div style="display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;border-top:1px solid #2A2A2A;padding-top:16px;">
      <span>GO·UNBROKEN — Strength Scores</span><span style="color:#A8A8A4;">REP · BY · REP</span>
    </div>
  </div>
</div>
<script>
addEventListener('load', () => {
  (async () => {
    try { await document.fonts.ready; } catch (e) {}
    setTimeout(() => window.print(), 500);
  })();
});
</script>
</body>
</html>`
}
