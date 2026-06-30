import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { useProfile } from '@/hooks/useProfile'
import { analyzeStrength, TIER_LABELS, TIER_COLORS } from '@/lib/strengthStandards'
import { MOVEMENT_GROUPS, getMovementCategory } from '@/lib/presetMovements'
import {
  calculateStrengthLevel,
  OVERALL_LEVEL_LABELS, OVERALL_LEVEL_COLORS,
  CONFIDENCE_LABELS, CONFIDENCE_COLORS,
} from '@/lib/strengthLevel'
import type { Movement } from '@/types'


function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function firstNameOf(name: string | null | undefined): string {
  if (!name) return 'Atleta'
  return name.trim().split(' ')[0]
}

const Ruler = () => (
  <div className="flex justify-between items-end w-full" style={{ height: 10 }}>
    {Array.from({ length: 41 }).map((_, i) => (
      <span key={i} style={{ width: 1.5, height: i % 5 === 0 ? 10 : 5, background: i % 5 === 0 ? '#F5F5F0' : '#2A2A2A', display: 'block' }} />
    ))}
  </div>
)

export default function Home() {
  const { user } = useAuth()
  const { movements, loading: loadingMovements } = useMovements(user?.id)
  const { loading: loadingScores, getPRsForMovement, getLastRecordedAt, getDelta, getPrimaryRM, scores } = useScores(user?.id)
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()
  const [showEmpty, setShowEmpty] = useState(false)

  const loading = loadingMovements || loadingScores

  // Stats
  const weekNum = getWeekNumber(new Date())
  const firstName = firstNameOf(profile?.name)
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0)
  const prsThisMonth = scores.filter(s => new Date(s.recorded_at) >= thisMonthStart).length
  const volume7d = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    return scores
      .filter(s => new Date(s.recorded_at + 'T00:00:00') >= cutoff)
      .reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
  })()

  // Best movement analysis (for headline %)
  const movementsWithScores = movements.filter(m => getPrimaryRM(m.id) !== null)
  const movementsWithoutScores = movements.filter(m => getPrimaryRM(m.id) === null)

  const allAnalyses = profile?.body_weight_kg && profile?.gender
    ? movementsWithScores
        .map(m => {
          const rm = getPrimaryRM(m.id)
          if (!rm) return null
          const w = getPRsForMovement(m.id)[rm]
          const a = analyzeStrength(m.name, w, profile.body_weight_kg!, profile.gender as 'male'|'female'|'other')
          return a ? { movement: m, analysis: a, weight: w, rm } : null
        })
        .filter(Boolean) as { movement: Movement; analysis: NonNullable<ReturnType<typeof analyzeStrength>>; weight: number; rm: number }[]
    : []

  // Hero PR: the one with best score
  const heroPR = allAnalyses.length > 0
    ? allAnalyses.reduce((best, cur) => (cur.analysis.score > best.analysis.score ? cur : best))
    : null

  // Best tier label/color for headline
  const bestTier = heroPR?.analysis.level ?? null
  const tierColor = bestTier ? TIER_COLORS[bestTier] : '#D4FF3A'

  // Movement list sorted alphabetically
  const alpha = (a: string, b: string) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })

  const sortedMovements = allAnalyses.length > 0
    ? allAnalyses.sort((a, b) => alpha(a.movement.name, b.movement.name))
    : movementsWithScores
        .sort((a, b) => alpha(a.name, b.name))
        .map(m => ({
          movement: m,
          analysis: null,
          weight: getPRsForMovement(m.id)[getPrimaryRM(m.id)!] ?? 0,
          rm: getPrimaryRM(m.id) ?? 1,
        }))

  // Delta for hero
  const heroDelta = heroPR ? getDelta(heroPR.movement.id, heroPR.rm) : null

  // Overall strength level
  const strengthLevel = profile?.body_weight_kg && profile?.gender
    ? calculateStrengthLevel(
        movements,
        getPRsForMovement,
        profile.body_weight_kg,
        profile.gender as 'male' | 'female' | 'other',
      )
    : null

  // Grouped by category for movements without analyses
  const grouped: { category: string; items: Movement[] }[] = MOVEMENT_GROUPS.map(g => ({
    category: g.category,
    items: movementsWithScores.filter(m => g.movements.includes(m.name)),
  })).filter(g => g.items.length > 0)
  const ungrouped = movementsWithScores.filter(m => !getMovementCategory(m.name))
  if (ungrouped.length > 0) grouped.push({ category: 'Outros', items: ungrouped })

  return (
    <div className="min-h-screen bg-graphite pb-24 md:pb-8 safe-top">

      {/* TopBar */}
      <header className="sticky top-0 z-10 bg-graphite border-b border-[#2A2A2A]" style={{ height: 52 }}>
        <div className="flex items-center justify-between px-4 h-full md:max-w-5xl md:mx-auto">
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
            GU · DASHBOARD
          </span>
          <button
            onClick={() => navigate('/athlete/profile')}
            className="w-10 h-10 flex items-center justify-center text-[#6B6B68] active:text-soft-white md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 5-6 8-6s7 2 8 6" />
            </svg>
          </button>
        </div>
      </header>

      <div className="overflow-y-auto md:max-w-5xl md:mx-auto md:px-8">

        {/* Greeting + headline */}
        <div className="px-5 pt-5 pb-5 md:px-0">
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
            Hello, {firstName} · Week {weekNum}
          </span>
          {!loading && allAnalyses.length > 0 ? (
            <h1 className="font-sans font-bold text-[28px] mt-2 leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
              You're in the{' '}
              <span style={{ color: tierColor }}>
                top {Math.round(100 - (heroPR?.analysis.score ?? 0))}%
              </span>{' '}
              of humanity.
            </h1>
          ) : !loading && (
            <h1 className="font-sans font-bold text-[28px] mt-2 leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
              Record your{' '}
              <span style={{ color: '#D4FF3A' }}>PRs</span>{' '}
              and see where you stand.
            </h1>
          )}
        </div>

        {/* Stats grid */}
        {!loading && scores.length > 0 && (
          <div
            className="mx-5 mb-5"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#2A2A2A' }}
          >
            <div className="bg-graphite px-0 py-3.5">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68] block mb-1.5">Volume · 7d</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-black text-[26px] text-soft-white leading-none">
                  {volume7d > 0 ? volume7d.toLocaleString('pt-BR') : '—'}
                </span>
                {volume7d > 0 && (
                  <span className="font-mono text-[11px] font-medium text-[#6B6B68]">kg</span>
                )}
              </div>
            </div>
            <div className="bg-graphite px-4 py-3.5">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68] block mb-1.5">PRs · month</span>
              <span className="font-mono font-black text-[26px] leading-none" style={{ color: '#D4FF3A' }}>
                {prsThisMonth}
              </span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Hero PR card */}
        {!loading && heroPR && (
          <div className="mx-5 mb-5" style={{ background: '#D4FF3A', color: '#0A0A0A' }}>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px]" style={{ color: 'rgba(10,10,10,0.6)' }}>
                    {heroPR.movement.name} · {heroPR.rm}RM
                  </span>
                  <div className="font-sans font-bold text-[15px] mt-1" style={{ letterSpacing: '-0.01em' }}>
                    Personal Record
                  </div>
                </div>
                <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-2 py-1" style={{ background: '#0A0A0A', color: '#D4FF3A' }}>
                  PR
                </span>
              </div>

              <div className="flex items-end justify-between mt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-black leading-none" style={{ fontSize: 52, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {heroPR.weight}
                  </span>
                  <span className="font-mono font-medium text-[15px]" style={{ color: 'rgba(10,10,10,0.5)' }}>KG</span>
                </div>
                {heroDelta && heroDelta.delta !== 0 && (
                  <span className="font-mono font-bold text-[12px]" style={{ color: 'rgba(10,10,10,0.7)' }}>
                    {heroDelta.delta > 0 ? '+' : ''}{heroDelta.delta} kg
                  </span>
                )}
              </div>

              <div className="mt-4">
                <Ruler />
              </div>
            </div>
          </div>
        )}

        {/* Movement list */}
        {!loading && sortedMovements.length > 0 && (
          <div>
            <div className="px-5 pb-2 flex items-center justify-between border-t border-[#2A2A2A] pt-4">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#A8A8A4]">
                Main PRs
              </span>
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                {sortedMovements.length} movements
              </span>
            </div>

            <div className="border-t border-[#2A2A2A]">
              {sortedMovements.map(({ movement, analysis, weight, rm }) => {
                const tierColor = analysis ? TIER_COLORS[analysis.level] : '#6B6B68'
                const tierShort = analysis ? TIER_LABELS[analysis.level] : null
                const score = analysis?.score

                return (
                  <button
                    key={movement.id}
                    onClick={() => navigate(`/athlete/movement/${movement.id}`)}
                    className="w-full text-left border-b border-[#2A2A2A] active:bg-[#141414] transition-colors"
                    style={{ display: 'grid', gridTemplateColumns: '4px 1fr auto', alignItems: 'center', gap: 16, padding: '16px 20px' }}
                  >
                    <span style={{ width: 4, alignSelf: 'stretch', background: tierColor, display: 'block', minHeight: 36 }} />
                    <div>
                      <div className="font-sans font-semibold text-[16px] text-soft-white" style={{ letterSpacing: '-0.01em' }}>
                        {movement.name}
                      </div>
                      {tierShort && (
                        <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] mt-1 block" style={{ color: tierColor }}>
                          {tierShort}{score !== undefined ? ` · top ${Math.round(100 - score)}%` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-bold text-[20px] text-soft-white" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                        {weight}
                      </span>
                      <span className="font-mono font-medium text-[11px] text-[#6B6B68]">KG</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Strength Level card ───────────────────────────────────────── */}
        {!loading && strengthLevel && (
          <div className="mx-5 mb-5 mt-4">
            {/* Card header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border border-b-0 border-[#2A2A2A]"
              style={{ background: '#0F0F0F' }}
            >
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                Strength Level
              </span>
              <span
                className="font-mono font-bold uppercase tracking-[0.1em] text-[9px]"
                style={{ color: CONFIDENCE_COLORS[strengthLevel.confidence] }}
              >
                Confidence: {CONFIDENCE_LABELS[strengthLevel.confidence]}
              </span>
            </div>

            {/* Card body */}
            <div className="border border-[#2A2A2A] px-4 pt-4 pb-4">
              {/* Level name + counts */}
              <div className="flex items-end justify-between mb-2">
                <span
                  className="font-sans font-bold leading-none"
                  style={{
                    fontSize: 32,
                    letterSpacing: '-0.02em',
                    color: OVERALL_LEVEL_COLORS[strengthLevel.level],
                  }}
                >
                  {OVERALL_LEVEL_LABELS[strengthLevel.level]}
                </span>
                <span className="font-mono text-[10px] text-[#3D3D3B] mb-1">
                  {strengthLevel.totalPRs} PRs · {strengthLevel.categoriesUsed} cat.
                </span>
              </div>

              {/* Score bar */}
              <div className="h-[3px] mb-4" style={{ background: '#1E1E1E' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${strengthLevel.score}%`,
                    background: OVERALL_LEVEL_COLORS[strengthLevel.level],
                  }}
                />
              </div>

              {/* Category breakdown */}
              {strengthLevel.categoryScores.map((cat, i) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between py-2"
                  style={{ borderTop: i > 0 ? '1px solid #1F1F1F' : 'none' }}
                >
                  <span className="font-mono text-[11px] text-[#6B6B68] uppercase tracking-[0.06em]">
                    {cat.label}
                  </span>
                  <span
                    className="font-mono font-bold text-[11px] uppercase tracking-[0.08em]"
                    style={{ color: OVERALL_LEVEL_COLORS[cat.level] }}
                  >
                    {OVERALL_LEVEL_LABELS[cat.level]}
                  </span>
                </div>
              ))}

              {/* Guidance */}
              <p
                className="font-mono text-[11px] text-[#6B6B68] mt-3 pt-3 leading-relaxed"
                style={{ borderTop: '1px solid #1F1F1F' }}
              >
                {strengthLevel.guidance}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && scores.length === 0 && (
          <div className="text-center py-16 px-8 space-y-3">
            <p className="font-sans font-bold text-[17px] text-soft-white">No PRs recorded</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#6B6B68]">
              Tap + to record your first lift
            </p>
          </div>
        )}

        {/* Movements without scores */}
        {!loading && movementsWithoutScores.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowEmpty(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 border-t border-[#2A2A2A]"
            >
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#3D3D3B]">
                No records ({movementsWithoutScores.length})
              </span>
              <svg className={`w-3.5 h-3.5 text-[#3D3D3B] transition-transform ${showEmpty ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showEmpty && (
              <div className="border-t border-[#1F1F1F]">
                {movementsWithoutScores.map(m => (
                  <button key={m.id} onClick={() => navigate(`/athlete/add?movement=${m.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[#1F1F1F] active:bg-[#141414]">
                    <span className="font-sans text-[14px] text-[#6B6B68]">{m.name}</span>
                    <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-lime">+ Record</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
