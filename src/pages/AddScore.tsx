import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { useProfile } from '@/hooks/useProfile'
import { useUnbrokenSets } from '@/hooks/useUnbrokenSets'
import { analyzeStrength, TIER_LABELS } from '@/lib/strengthStandards'
import { epley1RM } from '@/lib/scoreUtils'
import TierBar from '@/components/TierBar'
import { phCapture } from '@/lib/posthog'
import { BENCHMARK_WODS } from '@/lib/benchmarkWods'
import WodCard from '@/components/WodCard'
import type { MovementCategory } from '@/types'

const QUICK_ADJUST = [-5, -2.5, -1, +1, +2.5, +5]
const REP_BUTTONS = [1, 2, 3, 4, 5, 6, 8, 10]

const TABS: { id: MovementCategory; label: string }[] = [
  { id: 'weightlifting', label: 'WEIGHTLIFTING' },
  { id: 'gymnastics',    label: 'GINÁSTICOS' },
  { id: 'monostructural', label: 'MONOEST.' },
  { id: 'girls',         label: 'GIRLS' },
  { id: 'heroes',        label: 'HEROES' },
]

function fmtTime(secs: number): string {
  if (secs >= 60) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }
  return `${secs}s`
}

function rpsVal(reps: number, secs: number): string {
  return secs > 0 ? (reps / secs).toFixed(2) : '—'
}

export default function AddScore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { movements } = useMovements(user?.id)
  const { addScore, addTimeScore, getPRsForMovement, getPRTimeForMovement } = useScores(user?.id)
  const { profile } = useProfile(user?.id)
  const { getPRForMovement, getSetsForMovement } = useUnbrokenSets(user?.id)

  const today = new Date().toISOString().split('T')[0]

  const [activeTab, setActiveTab] = useState<MovementCategory>('weightlifting')
  const [movementId, setMovementId] = useState(searchParams.get('movement') ?? '')
  const [reps, setReps] = useState<number>(1)
  const [weight, setWeight] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeMin, setTimeMin] = useState(0)
  const [timeSec, setTimeSec] = useState(0)
  const [rx, setRx] = useState(true)
  const [scaledWeight, setScaledWeight] = useState(0)
  const [adaptation, setAdaptation] = useState('')
  const [savingTime, setSavingTime] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const movement = movements.find(m => m.id === movementId)

  useEffect(() => {
    if (movement?.category === 'gymnastics') {
      navigate(`/athlete/unbroken/${movement.id}`, { replace: true })
    }
  }, [movement?.id, movement?.category, navigate])

  const currentPR = movementId && reps ? (getPRsForMovement(movementId)[reps] ?? null) : null
  const wouldBePR = weight > 0 && (currentPR === null || weight > currentPR)
  const e1rm = epley1RM(weight, reps)

  const strengthAnalysis = movement && profile?.body_weight_kg && profile?.gender && reps === 1 && weight > 0
    ? analyzeStrength(movement.name, weight, profile.body_weight_kg, profile.gender as 'male' | 'female' | 'other')
    : null

  const filteredMovements = movements.filter(m =>
    m.category === activeTab &&
    (searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function adjustWeight(delta: number) {
    setWeight(prev => Math.max(0, Math.round((prev + delta) * 2) / 2))
  }

  function handleTabChange(tab: MovementCategory) {
    setActiveTab(tab)
    setMovementId('')
    setSearchQuery('')
    setWeight(0)
    setReps(1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!movementId || !reps || weight <= 0) return
    setSaving(true)
    try {
      const { newPR } = await addScore(movementId, reps, weight, today, notes || undefined)
      phCapture('pr_logged', {
        movement_name: movement?.name ?? movementId,
        reps,
        weight_kg: weight,
        is_new_pr: newPR,
      })
      if (newPR) {
        navigate(`/athlete/movement/${movementId}`, {
          replace: true,
          state: { celebratePR: true, weight, reps },
        })
      } else {
        navigate(-1)
      }
    } catch {
      // no-op: rare network error, user can retry
    } finally {
      setSaving(false)
    }
  }

  // ── GYMNASTICS: show movement list → navigate to UnbrokenDetail
  if (activeTab === 'gymnastics' && !movementId) {
    return (
      <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
        <header className="flex items-center justify-between px-5 border-b border-[#2A2A2A]" style={{ height: 52 }}>
          <button onClick={() => navigate(-1)} className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white">
            Cancel
          </button>
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">New PR</span>
          <div className="w-16" />
        </header>

        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-[#1A1A1A] relative">
          <svg className="absolute left-7 top-1/2 -translate-y-1/2 text-[#444]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full h-9 bg-[#111] border border-[#2A2A2A] pl-8 pr-3 text-[13px] text-soft-white placeholder-[#444] focus:outline-none focus:border-[#3A3A3A]"
          />
        </div>

        {/* Movement cards */}
        <div className="flex-1 overflow-y-auto">
          {filteredMovements.length === 0 ? (
            <p className="px-5 py-6 font-mono text-[10px] uppercase tracking-widest text-[#444]">Sem movimentos</p>
          ) : (
            filteredMovements.map(mv => {
              const pr = getPRForMovement(mv.id)
              const sets = getSetsForMovement(mv.id)
              return (
                <button
                  key={mv.id}
                  onClick={() => navigate(`/athlete/unbroken/${mv.id}`)}
                  className="w-full text-left px-4 py-3.5 border-b border-[#1A1A1A] active:bg-[#0D0D0D]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[15px] font-bold text-soft-white">{mv.name}</span>
                    <span className="font-mono font-bold text-[9px] uppercase tracking-[0.12em] text-[#888] border border-[#2A2A2A] bg-[#1A1A1A] px-1.5 py-0.5">GYM</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold leading-none" style={{ fontSize: 32, color: pr ? '#D4FF3A' : '#333' }}>
                      {pr ? pr.reps : '—'}
                    </span>
                    <span className="font-mono text-[9px] text-[#888] uppercase">reps</span>
                    {pr && (
                      <>
                        <span className="text-[#2A2A2A] text-lg">|</span>
                        <span className="font-mono font-bold text-[17px] text-soft-white">{fmtTime(pr.time_seconds)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#888]">
                      {pr ? `${rpsVal(pr.reps, pr.time_seconds)} reps/sec` : 'sem registos'}
                    </span>
                    {sets.length > 0 && (
                      <span className="font-mono text-[10px] text-[#555]">{sets.length} set{sets.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ── WEIGHTLIFTING / MONOEST. / GIRLS / HEROES: existing form flow
  // If no movement selected yet, show picker list
  if (!movementId) {
    return (
      <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
        <header className="flex items-center justify-between px-5 border-b border-[#2A2A2A]" style={{ height: 52 }}>
          <button onClick={() => navigate(-1)} className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white">
            Cancel
          </button>
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">New PR</span>
          <div className="w-16" />
        </header>

        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-[#1A1A1A] relative">
          <svg className="absolute left-7 top-1/2 -translate-y-1/2 text-[#444]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full h-9 bg-[#111] border border-[#2A2A2A] pl-8 pr-3 text-[13px] text-soft-white placeholder-[#444] focus:outline-none focus:border-[#3A3A3A]"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMovements.length === 0 ? (
            <p className="px-5 py-6 font-mono text-[10px] uppercase tracking-widest text-[#444]">Sem movimentos</p>
          ) : (
            filteredMovements.map(mv => {
              const pr = getPRsForMovement(mv.id)[1] ?? null
              return (
                <div key={mv.id} className="flex items-center border-b border-[#111]" style={{ height: 54 }}>
                  <button
                    className="flex-1 text-left flex items-center px-5 h-full active:bg-[#0D0D0D]"
                    onClick={() => setMovementId(mv.id)}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-soft-white">{mv.name}</div>
                      <div className="font-mono text-[10px] text-[#555]">
                        {pr !== null ? `PR: ${pr} kg` : 'Sem registos'}
                      </div>
                    </div>
                  </button>
                  <button
                    className="px-4 h-full flex items-center border-l border-[#1A1A1A] active:bg-[#0D0D0D]"
                    onClick={() => navigate(`/athlete/movement/${mv.id}`)}
                    aria-label="Ver histórico"
                  >
                    <svg width="16" height="16" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ── TIME ENTRY FORM (girls / heroes — score_type === 'time')
  if (movementId && movement?.score_type === 'time') {
    const totalSecs = timeMin * 60 + timeSec
    const prTime = getPRTimeForMovement(movementId)
    const isNewPR = totalSecs > 0 && (prTime === null || totalSecs < prTime)
    const wod = BENCHMARK_WODS[movement.name]

    async function handleSubmitTime() {
      if (totalSecs <= 0) return
      setSavingTime(true)
      setSaveError(null)
      const { error } = await addTimeScore(
        movementId,
        totalSecs,
        rx,
        adaptation || undefined,
        rx ? undefined : (scaledWeight > 0 ? scaledWeight : undefined),
        today,
      )
      setSavingTime(false)
      if (error) {
        setSaveError(error || 'Failed to save time')
        return
      }
      if (isNewPR) {
        navigate(`/athlete/movement/${movementId}`, {
          replace: true,
          state: { celebratePR: true, timeSeconds: totalSecs },
        })
      } else {
        navigate(-1)
      }
    }

    return (
      <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
        <header className="flex items-center justify-between px-5 border-b border-[#2A2A2A]" style={{ height: 52 }}>
          <button
            onClick={() => setMovementId('')}
            className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white"
          >
            ← Voltar
          </button>
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">New PR</span>
          <div className="w-16" />
        </header>

        <div className="px-5 py-3 border-b border-[#1A1A1A]">
          <span className="font-bold text-[20px] leading-tight" style={{ color: '#D4FF3A' }}>{movement.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* WOD description */}
          {wod && <WodCard wod={wod} className="mx-5 mt-4" />}

          {/* RX / SCALED */}
          <div className="flex mx-5 mt-5">
            <button
              onClick={() => setRx(true)}
              className="flex-1 py-3 font-mono font-bold uppercase tracking-[0.14em] text-[11px]"
              style={{
                background: rx ? '#D4FF3A' : '#111',
                color: rx ? '#0A0A0A' : '#555',
                border: `1px solid ${rx ? '#D4FF3A' : '#2A2A2A'}`,
              }}
            >RX</button>
            <button
              onClick={() => setRx(false)}
              className="flex-1 py-3 font-mono font-bold uppercase tracking-[0.14em] text-[11px]"
              style={{
                background: !rx ? '#1A1A1A' : '#111',
                color: !rx ? '#F5F5F0' : '#555',
                border: `1px solid ${!rx ? '#D4FF3A' : '#2A2A2A'}`,
                borderLeft: 'none',
              }}
            >SCALED</button>
          </div>

          {/* SCALED fields */}
          {!rx && (
            <div className="mx-5 mt-3 space-y-0">
              <div className="px-4 py-3.5 bg-[#111] border border-[#2A2A2A] border-b-0">
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">Peso utilizado (kg)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={scaledWeight === 0 ? '' : scaledWeight}
                  onChange={e => setScaledWeight(parseFloat(e.target.value) || 0)}
                  placeholder="ex: 30"
                  inputMode="decimal"
                  className="w-full bg-transparent text-soft-white focus:outline-none"
                  style={{ fontSize: 22, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, borderBottom: '1px solid #2A2A2A', paddingBottom: 4 }}
                />
              </div>
              <div className="px-4 py-3.5 bg-[#111] border border-[#2A2A2A]">
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">Adaptação</span>
                <input
                  type="text"
                  value={adaptation}
                  onChange={e => setAdaptation(e.target.value.slice(0, 200))}
                  placeholder="ex: Ring rows em vez de pull-ups"
                  className="w-full bg-transparent text-soft-white text-[13px] focus:outline-none placeholder-[#3D3D3B]"
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                />
              </div>
            </div>
          )}

          {/* Time input */}
          <div className="mx-5 mt-3 px-4 py-4 bg-[#141414] border border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-3">Tempo</span>
            <div className="flex items-center">
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={timeMin === 0 ? '' : timeMin}
                  onChange={e => setTimeMin(Math.min(99, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full bg-transparent text-soft-white focus:outline-none text-center"
                  style={{ fontSize: 52, fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, letterSpacing: '0.01em' }}
                />
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#555] mt-1">MIN</span>
              </div>
              <span className="font-mono font-black text-[#333] pb-5" style={{ fontSize: 44 }}>:</span>
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timeSec === 0 ? '' : timeSec}
                  onChange={e => setTimeSec(Math.min(59, parseInt(e.target.value) || 0))}
                  placeholder="00"
                  inputMode="numeric"
                  className="w-full bg-transparent text-soft-white focus:outline-none text-center"
                  style={{ fontSize: 52, fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, letterSpacing: '0.01em' }}
                />
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#555] mt-1">SEC</span>
              </div>
              {isNewPR && (
                <span className="ml-2 font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-2 py-1 shrink-0" style={{ background: '#D4FF3A', color: '#0A0A0A' }}>
                  NOVO PR
                </span>
              )}
            </div>
          </div>

          {prTime !== null && (
            <div className="mx-5 mt-2">
              <span className="font-mono text-[10px] text-[#555]">
                PR atual: <span className="text-[#888]">{fmtTime(prTime)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-4">
          {saveError && (
            <div className="mb-3 px-4 py-3 bg-[#1A0F0F] border border-[#4A1A1A]">
              <span className="font-mono text-[11px] text-[#FF6B6B]">{saveError}</span>
            </div>
          )}
          <button
            onClick={handleSubmitTime}
            disabled={savingTime || totalSecs <= 0}
            className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 flex items-center justify-center gap-2 disabled:opacity-30 active:bg-lime-lo transition-colors"
          >
            {savingTime && <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
            {savingTime ? 'Saving...' : 'Save Time'}
          </button>
        </div>
      </div>
    )
  }

  // ── PR ENTRY FORM (weightlifting / monoest. / girls / heroes)
  return (
    <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
      <header className="flex items-center justify-between px-5 border-b border-[#2A2A2A]" style={{ height: 52 }}>
        <button
          onClick={() => setMovementId('')}
          className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white"
        >
          ← Voltar
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">New PR</span>
        <div className="w-16" />
      </header>

      {/* Selected movement name */}
      <div className="px-5 py-3.5 border-b border-[#1A1A1A]">
        <span className="font-bold text-[20px] leading-tight" style={{ color: '#D4FF3A' }}>
          {movement?.name ?? ''}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">

          {/* Carga */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                Load
                {currentPR !== null && (
                  <span className="normal-case font-normal ml-2 text-[#3D3D3B]">
                    Current PR: {currentPR}kg
                  </span>
                )}
              </span>
              <span className="font-mono font-bold uppercase tracking-widest text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#A8A8A4]">KG</span>
            </div>

            <div className="border border-[#2A2A2A] bg-[#141414] flex items-center justify-between px-5" style={{ minHeight: 100 }}>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight === 0 ? '' : weight}
                onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent text-soft-white focus:outline-none"
                style={{ fontSize: 52, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 800, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                placeholder="0"
                inputMode="decimal"
              />
              {wouldBePR && (
                <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] px-2 py-1 ml-2" style={{ background: '#D4FF3A', color: '#0A0A0A', flexShrink: 0 }}>
                  NOVO PR
                </span>
              )}
            </div>

            <div className="flex mt-0" style={{ gap: 0 }}>
              {QUICK_ADJUST.map((delta, i) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => adjustWeight(delta)}
                  className="flex-1 py-3 font-mono font-bold text-[12px] text-soft-white active:bg-[#2A2A2A] transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: '#141414',
                  }}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Reps */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Reps</span>
              {e1rm && reps > 1 && (
                <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#A8A8A4]">
                  E1RM · {e1rm} KG
                </span>
              )}
            </div>
            <div className="flex" style={{ gap: 0 }}>
              {REP_BUTTONS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReps(r)}
                  className="flex-1 py-3.5 font-mono font-bold text-[13px] transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: reps === r ? '#D4FF3A' : '#141414',
                    color: reps === r ? '#0A0A0A' : '#A8A8A4',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Strength tier preview */}
          {strengthAnalysis && (
            <div className="px-5 pt-4 pb-5 border-b border-[#2A2A2A]">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-4">
                Strength level
              </span>
              <TierBar
                score={strengthAnalysis.score}
                kgToNextLevel={strengthAnalysis.kgToNextLevel}
                nextLevelLabel={strengthAnalysis.nextLevel ? TIER_LABELS[strengthAnalysis.nextLevel] : null}
              />
            </div>
          )}

          {/* Nota */}
          <div className="px-5 pt-5 pb-4">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">Note</span>
            <div className="border border-[#2A2A2A] bg-[#141414]">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                placeholder="How was it?"
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-4">
          <button
            type="submit"
            disabled={saving || !movementId || weight <= 0}
            className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 flex items-center justify-center gap-2 disabled:opacity-30 active:bg-lime-lo transition-colors"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save PR'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Tab bar component (Bug Pattern #18: full iOS scroll combo)
function TabBar({ activeTab, onTabChange }: { activeTab: MovementCategory; onTabChange: (t: MovementCategory) => void }) {
  return (
    <div
      style={{
        overflowX: 'scroll',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        borderBottom: '1px solid #2A2A2A',
        touchAction: 'pan-x',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', width: 'max-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              touchAction: 'pan-x',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0 14px',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #D4FF3A' : '2px solid transparent',
              color: activeTab === tab.id ? '#D4FF3A' : '#555',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
