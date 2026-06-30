import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import {
  BARS, BarKg, PLATES,
  calcPlates, calculateBuildup, getMovementCategory,
  suggestTarget, bestPRLabel, checkBuildupWarning,
} from '@/lib/buildupUtils'
import { BarbellSVG, PlateRow, Stepper } from '@/components/BuildupSheet'

// ─── Plate summary ────────────────────────────────────────────────────────────

// For each plate type, find the peak count needed simultaneously across any set.
// Since intermediate sets may use different plate combos, we can't just look at
// the last set — e.g. a 2.5kg plate used only in set 1 must still be picked up.
function buildPlateSummary(sets: { weight: number }[], barKg: number) {
  const peak = new Map<number, number>()
  for (const set of sets) {
    const perSide = calcPlates(set.weight, barKg)
    if (!perSide) continue
    const setCounts = new Map<number, number>()
    for (const p of perSide) setCounts.set(p.kg, (setCounts.get(p.kg) ?? 0) + 2)
    for (const [kg, count] of setCounts) {
      if ((peak.get(kg) ?? 0) < count) peak.set(kg, count)
    }
  }
  return PLATES
    .map(p => ({ kg: p.kg, color: p.color, count: peak.get(p.kg) ?? 0 }))
    .filter(p => p.count > 0)
}

function PlateSummary({ sets, barKg }: { sets: { weight: number }[]; barKg: number }) {
  const items = buildPlateSummary(sets, barKg)
  if (items.length === 0) return null

  return (
    <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid #2A2A2A', background: '#0C0C0C' }}>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
        Plates to add
      </span>
      <div className="flex flex-wrap gap-2">
        {items.map(({ kg, color, count }) => (
          <div key={kg} className="flex items-center gap-1.5" style={{ padding: '4px 10px', border: '1px solid #2A2A2A', background: '#111111' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: color, flexShrink: 0 }} />
            <span className="font-mono font-bold text-[11px] text-soft-white">
              {count}× {kg} KG
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Movement picker sheet ────────────────────────────────────────────────────

interface Movement { id: string; name: string }

function MovementPickerSheet({
  open, onClose, movements, onSelect,
}: {
  open: boolean
  onClose: () => void
  movements: Movement[]
  onSelect: (m: Movement) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = movements
    .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const outros = { id: '__outro__', name: 'Outro movimento' }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ maxWidth: 430, margin: '0 auto', background: '#111111', borderTop: '1px solid #2A2A2A', maxHeight: '80vh' }}
      >
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div style={{ width: 32, height: 3, background: '#3D3D3B' }} />
        </div>
        <div className="px-5 pb-3 shrink-0" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[10px] text-[#6B6B68] block mb-3">
            Selecionar movimento
          </span>
          <input
            autoFocus
            type="text"
            placeholder="Buscar..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent font-mono text-[13px] text-soft-white outline-none"
            style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: 8 }}
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => { onSelect(m); onClose() }}
              className="w-full flex items-center justify-between px-5 py-3.5 active:bg-[#141414]"
              style={{ borderBottom: '1px solid #1A1A1A' }}
            >
              <span className="font-sans font-semibold text-[14px] text-soft-white text-left">{m.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D3D3B" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
          <button
            onClick={() => { onSelect(outros); onClose() }}
            className="w-full flex items-center justify-between px-5 py-3.5 active:bg-[#141414]"
            style={{ borderBottom: '1px solid #1A1A1A' }}
          >
            <span className="font-sans font-semibold text-[14px] text-[#6B6B68] text-left">Outro movimento</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D3D3B" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Buildup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { movements } = useMovements(user?.id)
  const { getPRsForMovement } = useScores(user?.id)

  const inputRef = useRef<HTMLInputElement>(null)

  const [selectedMovement, setSelectedMovement] = useState<{ id: string; name: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rawTarget, setRawTarget] = useState('')
  const [barKg, setBarKg] = useState<BarKg>(20)
  const [nSets, setNSets] = useState(3)
  const [reps, setReps] = useState(5)

  const movementId = selectedMovement?.id
  const prs = movementId && movementId !== '__outro__' ? getPRsForMovement(movementId) : {}
  const suggestion = suggestTarget(prs, reps)
  const prLabel = bestPRLabel(prs, reps)
  const category = selectedMovement ? getMovementCategory(selectedMovement.name) : 'other'

  const target = parseFloat(rawTarget)
  const valid = !isNaN(target) && target > barKg
  const sets = valid ? calculateBuildup(target, reps, barKg, nSets, category) : []
  const selectedBar = BARS.find(b => b.kg === barKg)!
  const warning = valid && prs ? checkBuildupWarning(target, reps, prs as Record<number, number>) : null

  function applySuggestion() {
    if (suggestion) {
      setRawTarget(String(suggestion))
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="min-h-screen bg-graphite pb-16 safe-top flex flex-col">
      {/* TopBar */}
      <header className="flex items-center justify-between px-5 border-b border-[#2A2A2A] shrink-0" style={{ height: 52 }}>
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
          Calculadora de Build-up
        </span>
        <div style={{ width: 40 }} />
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* Movement selector */}
        <div style={{ borderBottom: '1px solid #2A2A2A' }}>
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 active:bg-[#141414]"
          >
            <div className="text-left">
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-0.5">
                Movimento
              </span>
              <span
                className="font-sans font-bold"
                style={{ fontSize: 17, letterSpacing: '-0.01em', color: selectedMovement ? '#F5F5F0' : '#3D3D3B' }}
              >
                {selectedMovement ? selectedMovement.name : 'Selecionar movimento'}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Main config — only show after movement is selected */}
        {selectedMovement ? (
          <>
            {/* Sets + Reps + Bar */}
            <div className="px-5" style={{ paddingTop: 20, paddingBottom: 20, borderBottom: '1px solid #2A2A2A' }}>
              <div className="flex gap-8 mb-5 flex-wrap">
                <Stepper label="Working sets" value={nSets} onChange={setNSets} min={1} max={10} />
                <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={15} />
              </div>

              {/* Bar selector */}
              <div>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
                  Bar type
                </span>
                <div className="flex gap-3">
                  {BARS.map(bar => {
                    const active = barKg === bar.kg
                    return (
                      <button
                        key={bar.kg}
                        onClick={() => setBarKg(bar.kg as BarKg)}
                        className="flex items-center gap-2 active:opacity-70"
                        style={{ padding: '10px 14px', border: active ? `1px solid ${bar.color}` : '1px solid #2A2A2A', background: active ? '#1A1A1A' : 'transparent' }}
                      >
                        <span style={{ display: 'inline-block', width: 10, height: 10, background: bar.color }} />
                        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px]" style={{ color: active ? '#F5F5F0' : '#6B6B68' }}>
                          {bar.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Target weight */}
            <div className="px-5" style={{ paddingTop: 20, paddingBottom: 20, borderBottom: '1px solid #2A2A2A' }}>
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-3">
                Target weight
              </span>
              <div className="flex items-baseline gap-2 mb-3">
                <input
                  ref={inputRef}
                  type="number" inputMode="decimal"
                  value={rawTarget}
                  onChange={e => setRawTarget(e.target.value)}
                  placeholder="0"
                  className="font-mono font-black text-soft-white bg-transparent outline-none"
                  style={{ fontSize: 56, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', width: 180, borderBottom: '2px solid #D4FF3A' }}
                />
                <span className="font-mono font-medium text-[#6B6B68] text-[18px]">KG</span>
              </div>

              {/* PR suggestion */}
              {suggestion !== null && (
                <div
                  className="flex items-center justify-between"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '10px 14px' }}
                >
                  <div>
                    {prLabel && (
                      <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68] block">
                        {prLabel}
                      </span>
                    )}
                    <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#A8A8A4]">
                      Suggestion for {reps} reps: <span style={{ color: '#D4FF3A' }}>{suggestion} kg</span>
                    </span>
                  </div>
                  <button
                    onClick={applySuggestion}
                    className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] active:opacity-70"
                    style={{ padding: '6px 12px', background: '#D4FF3A', color: '#0A0A0A' }}
                  >
                    Use
                  </button>
                </div>
              )}

              {rawTarget !== '' && !valid && (
                <span className="font-mono text-[11px] text-[#FF4444] uppercase tracking-wider block mt-2">
                  Peso deve ser maior que {barKg} kg (barra vazia)
                </span>
              )}
              {warning && (
                <div className="mt-3" style={{ background: '#1A0E00', border: '1px solid #FF8C00', padding: '10px 14px' }}>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: '#FF8C00' }}>
                    ⚠ {warning}
                  </span>
                </div>
              )}
            </div>

            {/* Results */}
            {valid && sets.length > 0 ? (
              <div>
                <PlateSummary sets={sets} barKg={barKg} />
                {sets.map((set, i) => {
                  const isBar = i === 0
                  const isTarget = i === sets.length - 1 && !isBar
                  const seriesNum = i
                  const pct = Math.round((set.weight / target) * 100)
                  const delta = i > 0 ? set.weight - sets[i - 1].weight : 0
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px 20px 14px',
                        borderBottom: '1px solid #1E1E1E',
                        background: isTarget ? '#0D0D00' : isBar ? '#0A0A0A' : 'transparent',
                        ...(isTarget ? { borderTop: '1px solid #D4FF3A' } : {}),
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className="font-mono font-bold uppercase tracking-[0.12em] text-[10px]"
                            style={{ color: isTarget ? '#D4FF3A' : '#3D3D3B', minWidth: 28 }}
                          >
                            {isBar ? '——' : `S${seriesNum}`}
                          </span>
                          <span
                            className="font-mono font-bold uppercase tracking-[0.1em] text-[10px]"
                            style={{ color: isBar ? '#6B6B68' : isTarget ? '#D4FF3A' : '#595956' }}
                          >
                            {isBar ? 'BARRA' : `${pct}%`}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-bold text-[12px]" style={{ color: isTarget ? '#D4FF3A' : '#6B6B68' }}>{set.reps}×</span>
                          <span className="font-mono font-black" style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums', color: isTarget ? '#D4FF3A' : '#F5F5F0' }}>{set.weight}</span>
                          <span className="font-mono text-[11px]" style={{ color: isTarget ? '#D4FF3A' : '#6B6B68' }}>KG</span>
                        </div>
                      </div>
                      <div style={{ paddingLeft: 44 }}>
                        <PlateRow totalKg={set.weight} barKg={barKg} barColor={selectedBar.color} />
                        {!isBar && (
                          <span className="font-mono font-bold text-[10px] mt-1 block" style={{ color: '#6EBF5E' }}>
                            +{delta} kg
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="px-5 py-4">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
                    {sets.length - 1} sets · {reps} reps per set · {selectedBar.label} bar
                  </span>
                </div>
              </div>
            ) : rawTarget !== '' && valid === false ? null : (
              <div className="px-5 py-12 text-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
                  Enter target weight to calculate build-up
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="px-5 py-16 text-center">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
              Select a movement to get started
            </span>
          </div>
        )}
      </div>

      <MovementPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        movements={movements}
        onSelect={m => {
          setSelectedMovement(m)
          setRawTarget('')  // reset target when movement changes
        }}
      />
    </div>
  )
}
