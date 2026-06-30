import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { useProfile } from '@/hooks/useProfile'
import { analyzeStrength, hasStrengthStandard, TIER_COLORS, TIER_LABELS } from '@/lib/strengthStandards'
import TierBar from '@/components/TierBar'
import { getMovementSuggestions } from '@/lib/movementSuggestions'
import { formatDate, formatDateShort } from '@/lib/utils'
import { epley1RM } from '@/lib/scoreUtils'
import BuildupSheet from '@/components/BuildupSheet'

const RANGES = ['1S', '1M', '3M', '1A', 'ALL'] as const
type Range = typeof RANGES[number]

const RANGE_DAYS: Record<string, number> = { '1S': 7, '1M': 30, '3M': 90, '1A': 365 }

const SUGGESTION_CATEGORIES = [
  { key: 'muscles',     label: 'Muscle groups' },
  { key: 'mobility',    label: 'Mobility' },
  { key: 'variations',  label: 'Variations' },
  { key: 'programming', label: 'Programming' },
] as const

function StatCell({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className="bg-graphite px-3 py-3.5 flex flex-col gap-1.5">
      <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono font-bold text-[20px] leading-none"
          style={{ fontVariantNumeric: 'tabular-nums', color: highlight ? '#D4FF3A' : '#F5F5F0' }}
        >
          {value}
        </span>
        {unit && value !== '—' && <span className="font-mono text-[10px] text-[#6B6B68]">{unit}</span>}
      </div>
    </div>
  )
}

export default function MovementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { movements } = useMovements(user?.id)
  const { getScoresForMovement, getPRsForMovement, deleteScore } = useScores(user?.id)
  const { profile } = useProfile(user?.id)

  const [filterReps, setFilterReps] = useState<number>(1)
  const [range, setRange] = useState<Range>('ALL')
  const [openSuggestions, setOpenSuggestions] = useState(false)
  const [openSuggestionCategory, setOpenSuggestionCategory] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [openBuildup, setOpenBuildup] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationWeight, setCelebrationWeight] = useState(0)
  const [celebrationReps, setCelebrationReps] = useState(1)

  const location = useLocation()
  useEffect(() => {
    const s = location.state as { celebratePR?: boolean; weight?: number; reps?: number } | null
    if (s?.celebratePR && s.weight && s.reps) {
      setCelebrationWeight(s.weight)
      setCelebrationReps(s.reps)
      setShowCelebration(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const movement = movements.find(m => m.id === id)
  const allScores = id ? getScoresForMovement(id) : []
  const prs = id ? getPRsForMovement(id) : {}
  const repCounts = [...new Set(allScores.map(s => s.reps))].sort((a, b) => a - b)

  const activeReps = repCounts.includes(filterReps) ? filterReps : (repCounts[0] ?? 1)

  const filteredByReps = allScores
    .filter(s => s.reps === activeReps)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))

  const cutoffDate = RANGE_DAYS[range]
    ? (() => { const d = new Date(); d.setDate(d.getDate() - RANGE_DAYS[range]); return d })()
    : null

  const filteredByRange = cutoffDate
    ? filteredByReps.filter(s => new Date(s.recorded_at + 'T00:00:00') >= cutoffDate)
    : filteredByReps

  const currentPR = prs[activeReps] ?? null

  // Scoring: prefer 1RM; if unavailable, estimate via Epley from lowest recorded RM
  const scoringRm     = repCounts.length > 0 ? repCounts[0] : null   // lowest = closest to 1RM
  const scoringWeight = scoringRm !== null ? (prs[scoringRm] ?? null) : null
  const weight1rm     = scoringRm === 1
    ? scoringWeight
    : (scoringRm !== null && scoringWeight !== null ? epley1RM(scoringWeight, scoringRm) : null)
  const isEstimated   = scoringRm !== null && scoringRm > 1 && weight1rm !== null

  const analysis = movement && profile?.body_weight_kg && profile?.gender && weight1rm
    ? analyzeStrength(movement.name, weight1rm, profile.body_weight_kg, profile.gender as 'male' | 'female' | 'other')
    : null
  const hasStandard = movement ? hasStrengthStandard(movement.name) : false
  const tierColor = analysis ? TIER_COLORS[analysis.level] : '#6B6B68'

  const periodStart = filteredByRange[0]?.weight_kg ?? null
  const periodPeak = filteredByRange.length > 0 ? Math.max(...filteredByRange.map(s => s.weight_kg)) : null
  const periodDelta = filteredByRange.length >= 2
    ? filteredByRange[filteredByRange.length - 1].weight_kg - filteredByRange[0].weight_kg
    : null

  // Recent delta (last vs second-to-last in full rep history)
  const recentDelta = filteredByReps.length >= 2
    ? filteredByReps[filteredByReps.length - 1].weight_kg - filteredByReps[filteredByReps.length - 2].weight_kg
    : null

  const suggestions = movement ? getMovementSuggestions(movement.name) : null

  async function handleShare() {
    if (sharing || !movement) return
    setSharing(true)
    try {
      const [{ buildStoriesData, buildStoriesContent }, { toPng }] = await Promise.all([
        import('@/lib/storiesReport'),
        import('html-to-image'),
      ])
      const data = buildStoriesData(
        allScores,
        movement.name,
        profile?.body_weight_kg ?? null,
        profile?.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | null,
        profile?.name ?? profile?.username ?? 'Atleta',
        profile?.username ?? null,
      )
      if (!data) return

      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1080px;height:1920px;overflow:hidden;pointer-events:none;'
      container.innerHTML = buildStoriesContent(data)
      document.body.appendChild(container)

      try {
        await document.fonts.ready
        const dataUrl = await toPng(container.firstElementChild as HTMLElement, {
          width: 1080, height: 1920, pixelRatio: 1,
        })

        const slug = movement.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const filename = `pr-${slug}.png`

        const res  = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], filename, { type: 'image/png' })

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${movement.name} PR · GO UNBROKEN` })
        } else {
          // Desktop fallback: download the PNG
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = filename
          a.click()
        }
      } finally {
        document.body.removeChild(container)
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleDeleteScore(scoreId: string) {
    await deleteScore(scoreId)
  }

  if (!movement) return (
    <div className="min-h-screen bg-graphite flex items-center justify-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#6B6B68]">Movement not found</p>
    </div>
  )

  // SVG chart
  const chartValues = filteredByRange.map(s => s.weight_kg)
  const W = 360, H = 160, PAD = 16
  const chartMin = chartValues.length > 0 ? Math.min(...chartValues) : 0
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) : 1
  const chartPts = chartValues.length >= 2
    ? chartValues.map((v, i) => {
        const x = PAD + (i * (W - 2 * PAD)) / (chartValues.length - 1)
        const y = H - PAD - ((v - chartMin) / ((chartMax - chartMin) || 1)) * (H - 2 * PAD)
        return [x, y]
      })
    : []
  const chartPath = chartPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const chartArea = chartPts.length >= 2
    ? `${chartPath} L${chartPts[chartPts.length - 1][0].toFixed(1)} ${H - PAD} L${chartPts[0][0].toFixed(1)} ${H - PAD} Z`
    : ''

  return (
    <div className="min-h-screen bg-graphite pb-28 safe-top safe-bottom flex flex-col">
      {/* TopBar */}
      <header
        className="flex items-center justify-between px-5 border-b border-[#2A2A2A] shrink-0"
        style={{ height: 52 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#A8A8A4] active:text-soft-white"
          style={{ width: 40, height: 40, marginLeft: -8 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
          History
        </span>
        <div style={{ width: 40 }} />
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* Header: name + RM badge + weight + delta + tier */}
        <div className="px-5 pt-4 pb-5 border-b border-[#2A2A2A]">

          {/* Movement name */}
          <h1
            className="font-sans font-bold text-soft-white"
            style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.05 }}
          >
            {movement.name}
          </h1>

          {/* Weight row: big number + RM badge + delta */}
          <div className="flex items-end justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono font-black text-soft-white leading-none"
                style={{ fontSize: 56, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums' }}
              >
                {currentPR ?? '—'}
              </span>
              {currentPR !== null && (
                <span className="font-mono font-medium text-[15px] text-[#6B6B68]">KG</span>
              )}
              {/* RM type badge — always visible */}
              <span
                className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] px-2 py-1 mb-1"
                style={{ background: '#1E1E1E', color: '#A8A8A4', border: '1px solid #2A2A2A' }}
              >
                {activeReps}RM
              </span>
            </div>
            {recentDelta !== null && recentDelta !== 0 && (
              <span
                className="font-mono font-bold text-[14px] mb-1"
                style={{ color: recentDelta > 0 ? '#D4FF3A' : '#FF4444' }}
              >
                {recentDelta > 0 ? '+' : ''}{recentDelta} kg
              </span>
            )}
          </div>

          {/* Build-up + Share buttons */}
          {currentPR !== null && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setOpenBuildup(true)}
                className="flex items-center gap-2 active:opacity-70 transition-opacity"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '8px 14px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[11px] text-[#D4FF3A]">
                  Build-up
                </span>
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-2 active:opacity-70 transition-opacity disabled:opacity-40"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '8px 14px' }}
              >
                {sharing
                  ? <span className="w-3 h-3 border border-[#6B6B68] border-t-transparent rounded-full animate-spin" />
                  : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8A8A4" strokeWidth="2.5">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )
                }
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[11px] text-[#A8A8A4]">
                  {sharing ? 'Generating...' : 'Share'}
                </span>
              </button>
            </div>
          )}

          {/* E1RM info — shown when the scoring was based on an estimated 1RM */}
          {isEstimated && weight1rm !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">
                E1RM
              </span>
              <span className="font-mono font-bold text-[14px] text-[#A8A8A4]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {weight1rm} KG
              </span>
              <span className="font-mono text-[10px] text-[#3D3D3B]">
                · calculated via Epley from {scoringRm}RM
              </span>
            </div>
          )}

          {/* Tier classification */}
          {analysis && hasStandard && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-2 py-1 border"
                  style={{ color: tierColor, borderColor: tierColor }}
                >
                  {analysis.levelLabel}
                </span>
                <span className="font-mono font-bold uppercase tracking-[0.1em] text-[11px] text-[#A8A8A4]">
                  top {Math.round(100 - analysis.score)}% global
                </span>
              </div>
              <TierBar
                score={analysis.score}
                kgToNextLevel={analysis.kgToNextLevel}
                nextLevelLabel={analysis.nextLevel ? TIER_LABELS[analysis.nextLevel] : null}
              />
            </div>
          )}

          {/* No scoring — has standard but missing profile data */}
          {!analysis && hasStandard && (
            <div className="mt-4 border border-[#2A2A2A] px-4 py-3">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#3D3D3B] block">
                {!profile?.body_weight_kg || !profile?.gender
                  ? 'Set weight and gender in your profile to see classification'
                  : 'Insufficient data to calculate classification'}
              </span>
            </div>
          )}

          {/* No scoring — movement not in scoring database */}
          {!hasStandard && (
            <div className="mt-4 border border-[#2A2A2A] px-4 py-3">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#3D3D3B]">
                No classification available for this movement
              </span>
            </div>
          )}
        </div>

        {/* RM filter tabs (only if multiple rep counts) */}
        {repCounts.length > 1 && (
          <div className="flex border-b border-[#2A2A2A]">
            {repCounts.map((r, i) => (
              <button
                key={r}
                onClick={() => setFilterReps(r)}
                className="flex-1 py-3 font-mono font-bold text-[12px] uppercase tracking-widest transition-colors"
                style={{
                  borderRight: i < repCounts.length - 1 ? '1px solid #2A2A2A' : 'none',
                  background: activeReps === r ? '#F5F5F0' : 'transparent',
                  color: activeReps === r ? '#0A0A0A' : '#6B6B68',
                }}
              >
                {r}RM
              </button>
            ))}
          </div>
        )}

        {/* Range selector */}
        <div className="flex border-b border-[#2A2A2A]">
          {RANGES.map((r, i) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="flex-1 py-3 font-mono font-bold text-[12px] uppercase tracking-[0.1em] transition-colors"
              style={{
                borderRight: i < RANGES.length - 1 ? '1px solid #2A2A2A' : 'none',
                background: range === r ? '#F5F5F0' : 'transparent',
                color: range === r ? '#0A0A0A' : '#6B6B68',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartPts.length >= 2 ? (
          <div className="px-3 pt-5 pb-2">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
              {[0.25, 0.5, 0.75].map((g, i) => (
                <line
                  key={i}
                  x1={PAD} x2={W - PAD}
                  y1={PAD + g * (H - 2 * PAD)}
                  y2={PAD + g * (H - 2 * PAD)}
                  stroke="#2A2A2A" strokeWidth="1" strokeDasharray="2 4"
                />
              ))}
              <path d={chartArea} fill={tierColor} fillOpacity="0.12" />
              <path d={chartPath} fill="none" stroke={tierColor} strokeWidth="2" />
              {chartPts.map((p, i) => (
                <rect key={i} x={p[0] - 2} y={p[1] - 2} width="4" height="4" fill={tierColor} />
              ))}
              <rect
                x={chartPts[chartPts.length - 1][0] - 5}
                y={chartPts[chartPts.length - 1][1] - 5}
                width="10" height="10"
                fill="none" stroke="#F5F5F0" strokeWidth="1.5"
              />
            </svg>
            <div className="flex justify-between px-4 pt-1">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">
                {filteredByRange[0]?.recorded_at ? formatDateShort(filteredByRange[0].recorded_at) : ''}
              </span>
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">today</span>
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
              {filteredByReps.length === 0 ? 'No record' : 'Not enough data to display chart'}
            </span>
          </div>
        )}

        {/* Stats row */}
        {filteredByRange.length > 0 && (
          <div
            className="mx-4 mb-4 mt-1"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#2A2A2A' }}
          >
            <StatCell label="Start" value={periodStart !== null ? String(periodStart) : '—'} unit="KG" />
            <StatCell label="Peak" value={periodPeak !== null ? String(periodPeak) : '—'} unit="KG" highlight />
            <StatCell
              label="Δ period"
              value={periodDelta !== null ? `${periodDelta > 0 ? '+' : ''}${periodDelta}` : '—'}
              unit={periodDelta !== null ? 'KG' : undefined}
            />
          </div>
        )}

        {/* Sessions list */}
        <div className="border-t border-[#2A2A2A]">
          <div className="px-5 py-3 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#A8A8A4]">
              Recent sessions
            </span>
          </div>
          {filteredByReps.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#6B6B68]">No record</p>
            </div>
          ) : (
            <div>
              {[...filteredByReps].reverse().map(score => {
                const isPR = prs[score.reps] === score.weight_kg
                return (
                  <div
                    key={score.id}
                    className="border-b border-[#2A2A2A]"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 20px',
                    }}
                  >
                    <div>
                      <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68] block">
                        {formatDate(score.recorded_at)}
                      </span>
                      {score.notes && (
                        <span className="font-mono text-[12px] text-[#A8A8A4] mt-0.5 block">{score.notes}</span>
                      )}
                    </div>
                    {isPR && (
                      <span
                        className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-2 py-1"
                        style={{ background: '#D4FF3A', color: '#0A0A0A' }}
                      >
                        PR
                      </span>
                    )}
                    <div className="flex items-baseline gap-0.5">
                      <span
                        className="font-mono font-bold text-[18px] text-soft-white"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {score.weight_kg}
                      </span>
                      <span className="font-mono text-[10px] text-[#6B6B68]">KG</span>
                    </div>
                    {confirmingDeleteId === score.id ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-[#FF4444] uppercase tracking-wider">Delete?</span>
                        <button
                          onClick={() => { setConfirmingDeleteId(null); handleDeleteScore(score.id) }}
                          className="font-mono text-[10px] font-bold text-[#0A0A0A] px-2 py-1 transition-colors"
                          style={{ background: '#FF4444' }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="font-mono text-[10px] text-[#6B6B68] px-2 py-1 border border-[#2A2A2A] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingDeleteId(score.id)}
                        className="text-[#3D3D3B] active:text-[#FF4444] transition-colors p-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suggestions accordion */}
        {suggestions && (
          <div className="border-t border-[#2A2A2A] mt-4">
            <button
              onClick={() => setOpenSuggestions(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A2A]"
            >
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                How to improve in {movement.name}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-[#6B6B68] transition-transform ${openSuggestions ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSuggestions && (
              <div>
                {SUGGESTION_CATEGORIES.map(({ key, label }) => {
                  const items = suggestions[key as keyof typeof suggestions]
                  if (!items.length) return null
                  const isOpen = openSuggestionCategory === key
                  return (
                    <div key={key} className="border-b border-[#2A2A2A]">
                      <button
                        onClick={() => setOpenSuggestionCategory(isOpen ? null : key)}
                        className="w-full flex items-center justify-between px-5 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[14px] font-semibold text-[#A8A8A4]">{label}</span>
                          <span className="font-mono text-[10px] text-[#3D3D3B]">{items.length}</span>
                        </div>
                        <svg
                          className={`w-3 h-3 text-[#3D3D3B] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 space-y-3">
                          {items.map((s, i) => (
                            <div key={i} className="border-l-2 border-[#2A2A2A] pl-3">
                              <span className="font-sans text-[13px] font-semibold text-soft-white block">{s.title}</span>
                              <p className="font-mono text-[12px] text-[#6B6B68] mt-0.5 leading-relaxed">{s.detail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* FAB */}
      <button
        onClick={() => navigate(`/athlete/add?movement=${id}`)}
        className="fixed bottom-6 right-5 flex items-center justify-center z-10 active:scale-95 transition-transform"
        style={{ width: 52, height: 52, background: '#D4FF3A' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <BuildupSheet
        open={openBuildup}
        onClose={() => setOpenBuildup(false)}
        movementName={movement.name}
        defaultTarget={currentPR ?? 0}
        defaultReps={activeReps}
        prs={prs}
      />

      {showCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCelebration(false)} />
          <div className="relative bg-[#111111] border-t-2 border-[#D4FF3A] px-5 pt-7 pb-10" style={{ zIndex: 1 }}>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4FF3A] mb-3">
              New Personal Record
            </div>
            <div className="font-sans text-[26px] font-bold leading-tight text-white mb-4">
              {movement.name}
            </div>
            <div className="flex items-baseline gap-3 mb-7">
              <span className="font-mono text-[52px] font-black leading-none text-[#D4FF3A]">
                {celebrationWeight}
              </span>
              <span className="font-mono text-[20px] font-bold" style={{ color: 'rgba(212,255,58,0.4)' }}>KG</span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#6B6B68] border border-[#2A2A2A] px-2 py-1 ml-1">
                {celebrationReps}RM
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A0A0A]"
                style={{ background: '#D4FF3A' }}
              >
                {sharing
                  ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                }
                {sharing ? 'Gerando...' : 'Compartilhar'}
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                className="flex-1 py-3.5 border border-[#2A2A2A] font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6B68]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
