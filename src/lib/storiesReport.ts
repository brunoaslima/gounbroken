import { analyzeStrength } from './strengthStandards'
import { fmtDate, fmtChartDate, esc } from './prReport'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say' | null | undefined

interface RawScore {
  movement_id: string
  reps: number
  weight_kg: number
  recorded_at: string
}

interface ChartPoint { date: string; weight: number; rawDate: string }

export interface StoriesData {
  movementName: string
  athleteName: string
  username: string | null
  principalReps: number
  principalWeight: number
  principalDate: string
  also: { reps: number; weight: number; date: string }[]
  tierLabel: string | null
  tierColor: string
  percentile: number | null
  bodyWeightRatio: number | null
  progression: ChartPoint[]
  delta: number | null
}

export function buildStoriesData(
  scores: RawScore[],
  movementName: string,
  bodyWeightKg: number | null | undefined,
  gender: Gender,
  athleteName: string,
  username: string | null,
): StoriesData | null {
  if (!scores.length) return null

  // Max weight per rep count
  const prMap: Record<number, number> = {}
  for (const s of scores) {
    const cur = prMap[s.reps] ?? 0
    if (s.weight_kg > cur) prMap[s.reps] = s.weight_kg
  }

  // Most recent date for each PR
  const dateMap: Record<number, string> = {}
  for (const s of scores) {
    const pr = prMap[s.reps]
    if (s.weight_kg === pr) {
      const ex = dateMap[s.reps]
      if (!ex || s.recorded_at > ex) dateMap[s.reps] = s.recorded_at
    }
  }

  const reps = Object.keys(prMap).map(Number).sort((a, b) => a - b)
  if (!reps.length) return null

  const principalReps = reps[0]
  const also = reps.slice(1).map(r => ({
    reps: r, weight: prMap[r], date: dateMap[r] ? fmtDate(dateMap[r]) : '—',
  }))

  const bw = bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : null
  const g  = gender === 'male' || gender === 'female' ? gender : null

  let tierLabel: string | null = null
  let tierColor = '#6B6B68'
  let percentile: number | null = null
  let bodyWeightRatio: number | null = null

  if (bw && g && prMap[1]) {
    const analysis = analyzeStrength(movementName, prMap[1], bw, g)
    if (analysis) {
      tierLabel = analysis.levelLabel
      tierColor = analysis.levelColor
      percentile = Math.round(100 - analysis.score)
      bodyWeightRatio = Math.round(analysis.bodyWeightRatio * 10) / 10
    }
  }

  // Historical 1RM progression: max per day, last 7 points
  const dayMap: Record<string, number> = {}
  for (const s of scores) {
    if (s.reps !== 1) continue
    const cur = dayMap[s.recorded_at] ?? 0
    if (s.weight_kg > cur) dayMap[s.recorded_at] = s.weight_kg
  }
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
    movementName, athleteName, username,
    principalReps, principalWeight: prMap[principalReps],
    principalDate: dateMap[principalReps] ? fmtDate(dateMap[principalReps]) : '—',
    also, tierLabel, tierColor, percentile, bodyWeightRatio, progression, delta,
  }
}

// Returns just the inner poster div — used with html-to-image for native sharing
export function buildStoriesContent(d: StoriesData): string {
  const hasChart = d.progression.length >= 2
  const hasAlso  = d.also.length > 0
  const is1RM    = d.principalReps === 1

  // Chart SVG — 968×340, full usable width
  function buildChart(): string {
    const prog = d.progression
    const n = prog.length
    const weights = prog.map(p => p.weight)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const wRange = maxW - minW || 1

    const pts = prog.map((p, i) => ({
      x: 8 + 952 * i / (n - 1),
      y: 326 - ((p.weight - minW) / wRange) * 306,
    }))

    const polyPts = pts.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const fillPts = polyPts + ` ${pts[n-1].x.toFixed(1)},340 ${pts[0].x.toFixed(1)},340`

    const totalGain = Math.round((weights[n-1] - weights[0]) * 10) / 10
    const gainStr   = totalGain > 0 ? `+${totalGain}` : `${totalGain}`
    const [y1, m1]  = prog[0].rawDate.split('-').map(Number)
    const [y2, m2]  = prog[n-1].rawDate.split('-').map(Number)
    const months    = (y2 - y1) * 12 + (m2 - m1)
    const periodStr = months <= 1 ? '1 month' : `${months} months`

    const labelIdxs = n > 3 ? [0, Math.floor(n / 2), n - 1] : [0, n - 1]
    const labelHtml = labelIdxs.map(i => `<span>${weights[i]} · ${prog[i].date}</span>`).join('')

    const circles = pts.map(({ x, y }, i) => i === n - 1
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#D4FF3A"></circle><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#0A0A0A"></circle>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#D4FF3A" opacity="0.6"></circle>`
    ).join('')

    return `
      <div style="margin-top:56px;border-top:1px solid #2A2A2A;padding-top:36px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B6B68;display:inline-flex;align-items:center;gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" stroke-width="2" stroke-linecap="square"><path d="M3 17l6-6 4 4 8-8"></path><path d="M16 7h5v5"></path></svg>
            Progression · ${periodStr}
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:800;letter-spacing:0.02em;color:#D4FF3A;">${gainStr} KG</span>
        </div>
        <svg width="968" height="340" viewBox="0 0 968 340" style="display:block;">
          <line x1="8" y1="326" x2="960" y2="326" stroke="#2A2A2A" stroke-width="1.5"></line>
          <polygon points="${fillPts}" fill="rgba(212,255,58,0.06)"></polygon>
          <polyline points="${polyPts}" fill="none" stroke="#D4FF3A" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="square"></polyline>
          ${circles}
        </svg>
        <div style="display:flex;justify-content:space-between;margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:0.08em;color:#6B6B68;">
          ${labelHtml}
        </div>
      </div>`
  }

  // RM ladder
  const alsoSection = hasAlso ? `
    <div style="margin-top:52px;border-top:1px solid #2A2A2A;padding-top:32px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;margin-bottom:22px;">Outros recordes</div>
      <div style="display:flex;gap:14px;">
        ${d.also.slice(0, 4).map(rm => `
          <div style="flex:1;display:flex;align-items:center;gap:20px;border:1.5px solid #2A2A2A;padding:20px 24px;background:#111111;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;letter-spacing:0.04em;color:#A8A8A4;border-right:1.5px solid #2A2A2A;padding-right:20px;white-space:nowrap;">${rm.reps}RM</span>
            <div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:800;line-height:1;color:#F5F5F0;font-variant-numeric:tabular-nums;">${rm.weight}<span style="font-size:18px;font-weight:500;color:#6B6B68;margin-left:6px;">KG</span></div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:0.08em;color:#6B6B68;margin-top:6px;">${rm.date}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''

  const metaParts: string[] = []
  if (d.delta !== null && d.delta !== 0)
    metaParts.push(`${d.delta > 0 ? '+' : ''}${d.delta} KG vs previous`)
  if (d.bodyWeightRatio !== null)
    metaParts.push(`${d.bodyWeightRatio}× bodyweight`)

  const tierBadge = d.tierLabel && d.percentile !== null ? `
    <div style="margin-top:32px;display:flex;align-items:center;gap:18px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:12px 22px;border:2px solid ${d.tierColor};color:${d.tierColor};">${esc(d.tierLabel.toUpperCase())}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;letter-spacing:0.08em;color:#6B6B68;">top ${d.percentile}% global</span>
    </div>` : ''

  const rmBadgeStyle = is1RM
    ? 'border:1.5px solid #2A2A2A;color:#A8A8A4;background:transparent;'
    : 'border:1.5px solid #3D3D3B;background:#1F1F1F;color:#F5F5F0;'

  const inner = `<div style="position:relative;width:1080px;height:1920px;background:#0A0A0A;border:1px solid #2A2A2A;padding:60px 64px 52px;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk','Helvetica Neue',sans-serif;">
  <span style="position:absolute;top:22px;left:22px;width:18px;height:18px;background:linear-gradient(#3D3D3B,#3D3D3B) center/18px 2px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/2px 18px no-repeat;"></span>
  <span style="position:absolute;top:22px;right:22px;width:18px;height:18px;background:linear-gradient(#D4FF3A,#D4FF3A) center/18px 2px no-repeat,linear-gradient(#D4FF3A,#D4FF3A) center/2px 18px no-repeat;"></span>
  <span style="position:absolute;bottom:22px;left:22px;width:18px;height:18px;background:linear-gradient(#3D3D3B,#3D3D3B) center/18px 2px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/2px 18px no-repeat;"></span>
  <span style="position:absolute;bottom:22px;right:22px;width:18px;height:18px;background:linear-gradient(#3D3D3B,#3D3D3B) center/18px 2px no-repeat,linear-gradient(#3D3D3B,#3D3D3B) center/2px 18px no-repeat;"></span>
  <div style="position:absolute;top:180px;bottom:140px;left:34px;width:11px;background:repeating-linear-gradient(180deg,#2A2A2A 0 2px,transparent 2px 28px);"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:16px;">
      <svg viewBox="0 0 240 240" width="56" height="56" style="display:block;"><rect width="240" height="240" fill="#D4FF3A"></rect><g transform="translate(40 64)" fill="#0A0A0A"><path d="M0 0 H68 V18 H20 V46 H46 V32 H36 V18 H68 V112 H0 Z"></path></g><rect x="24" y="116" width="192" height="6" fill="#0A0A0A"></rect><g transform="translate(132 64)" fill="#0A0A0A"><path d="M0 0 H20 V90 H48 V0 H68 V112 H0 Z"></path></g></svg>
      <div style="display:flex;align-items:center;gap:10px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.02em;color:#F5F5F0;">GO<span style="width:24px;height:6px;background:#D4FF3A;display:inline-block;"></span>UNBROKEN</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600;letter-spacing:-0.01em;color:#F5F5F0;">${esc(d.athleteName)}</div>
      ${d.username ? `<div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:500;letter-spacing:0.04em;color:#6B6B68;margin-top:4px;">@${esc(d.username)}</div>` : ''}
    </div>
  </div>
  <div style="height:1.5px;background:#2A2A2A;margin:24px 0 52px;"></div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#D4FF3A;margin-bottom:22px;">Recorde Pessoal</div>
  <div style="font-family:'Space Grotesk',sans-serif;font-size:104px;font-weight:700;letter-spacing:-0.03em;line-height:0.88;color:#F5F5F0;word-break:break-word;">${esc(d.movementName)}</div>
  <div style="display:flex;align-items:center;gap:18px;margin-top:28px;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:10px 18px;${rmBadgeStyle}">${d.principalReps}RM</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;">${d.principalDate}</span>
  </div>
  <div style="display:flex;align-items:baseline;gap:22px;margin-top:36px;">
    <span style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:260px;line-height:0.82;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:#D4FF3A;">${d.principalWeight}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:68px;letter-spacing:0.04em;color:rgba(212,255,58,0.4);">KG</span>
  </div>
  ${metaParts.length > 0 ? `<div style="margin-top:30px;font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B6B68;">${metaParts.join(' · ')}</div>` : ''}
  ${tierBadge}
  ${hasChart ? buildChart() : ''}
  ${alsoSection}
  <div style="flex:1;"></div>
  <div style="margin-top:48px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;">Strength scale · global percentile</span>
      ${d.tierLabel ? `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;">you → <span style="color:${d.tierColor};">${esc(d.tierLabel)}</span></span>` : ''}
    </div>
    <div style="display:flex;height:12px;gap:3px;">
      <div style="flex:1;background:#6B6B68;"></div><div style="flex:1;background:#A8A8A4;"></div><div style="flex:1;background:#4DA3FF;"></div><div style="flex:1;background:#D4FF3A;"></div><div style="flex:1.4;background:#FF8A00;"></div><div style="flex:1;background:#FF3B30;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B6B68;">
      <span>Untrained</span><span>Beginner</span><span>Interm.</span><span>Advanced</span><span style="color:#FF8A00;">Elite</span><span>World</span>
    </div>
  </div>
  <div style="margin-top:30px;border-top:1px solid #2A2A2A;padding-top:22px;display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B68;">
    <span>GO·UNBROKEN — Strength Scores</span><span style="color:#A8A8A4;">REP · BY · REP</span>
  </div>
</div>`

  return inner
}

// Returns the full printable HTML document (fallback)
export function buildStoriesHTML(d: StoriesData): string {
  const inner = buildStoriesContent(d)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(d.movementName)} PR · GO UNBROKEN</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #0A0A0A; }
@page { size: 1080px 1920px; margin: 0; }
@media print { *, *::before, *::after { transition-duration: 0s !important; animation: none !important; } }
</style>
</head>
<body>
${inner}
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
