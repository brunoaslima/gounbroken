import { useEffect, useRef, useState } from 'react'
import {
  BARS, BarKg, PLATES, PLATE_H, PLATE_W, Plate,
  calcPlates, perSideKg, calculateBuildup, getMovementCategory, checkBuildupWarning,
} from '@/lib/buildupUtils'

// ─── Plate summary ────────────────────────────────────────────────────────────

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
    <div style={{ padding: '10px 20px 12px', borderBottom: '1px solid #1E1E1E', background: '#0C0C0C' }}>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
        Anilhas a pegar
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ kg, color, count }) => (
          <div key={kg} className="flex items-center gap-1.5" style={{ padding: '3px 8px', border: '1px solid #2A2A2A', background: '#111111' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, background: color, flexShrink: 0 }} />
            <span className="font-mono font-bold text-[10px] text-soft-white">
              {count}× {kg} KG
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Barbell SVG ──────────────────────────────────────────────────────────────

export function BarbellSVG({ plates, barColor }: { plates: Plate[]; barColor: string }) {
  const SHAFT_W = 24, COLLAR_W = 8, COLLAR_H = 14, BAR_H = 5, GAP = 1

  const maxPlateH = plates.length > 0 ? Math.max(...plates.map(p => PLATE_H[p.kg])) : 0
  const svgH = Math.max(maxPlateH, COLLAR_H) + 8
  const cy = svgH / 2
  const platesW = plates.reduce((acc, p) => acc + PLATE_W[p.kg] + GAP, 0)
  const svgW = SHAFT_W + COLLAR_W + platesW + 2

  let x = SHAFT_W + COLLAR_W
  const rects = plates.map((p, i) => {
    const h = PLATE_H[p.kg], w = PLATE_W[p.kg]
    const el = <rect key={i} x={x} y={cy - h / 2} width={w} height={h} fill={p.color} />
    x += w + GAP
    return el
  })

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
      <rect x={0} y={cy - BAR_H / 2} width={SHAFT_W} height={BAR_H} fill={barColor} />
      <rect x={SHAFT_W} y={cy - COLLAR_H / 2} width={COLLAR_W} height={COLLAR_H} fill={barColor} />
      {rects}
    </svg>
  )
}

// ─── Plate row ────────────────────────────────────────────────────────────────

export function PlateRow({ totalKg, barKg, barColor }: { totalKg: number; barKg: number; barColor: string }) {
  const plates = calcPlates(totalKg, barKg)
  const side = perSideKg(totalKg, barKg)

  if (totalKg === barKg) {
    return (
      <div className="flex items-center gap-3">
        <BarbellSVG plates={[]} barColor={barColor} />
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
          somente barra
        </span>
      </div>
    )
  }
  if (plates === null) {
    return (
      <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#FF4444]">
        not achievable with available plates
      </span>
    )
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <BarbellSVG plates={plates} barColor={barColor} />
      <span className="font-mono font-bold text-[10px] text-[#6B6B68]">
        {side % 1 === 0 ? side : side.toFixed(1)} kg/lado
      </span>
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

export function Stepper({ value, onChange, min, max, label }: {
  value: number; onChange: (v: number) => void
  min: number; max: number; label: string
}) {
  return (
    <div>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
        {label}
      </span>
      <div className="flex items-center gap-0">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex items-center justify-center font-mono font-black text-[16px]"
          style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A', color: value <= min ? '#3D3D3B' : '#F5F5F0' }}
        >−</button>
        <span
          className="font-mono font-black text-soft-white text-center"
          style={{ width: 48, height: 40, lineHeight: '40px', fontSize: 18, fontVariantNumeric: 'tabular-nums', background: '#111111', borderTop: '1px solid #2A2A2A', borderBottom: '1px solid #2A2A2A' }}
        >{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex items-center justify-center font-mono font-black text-[16px]"
          style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A', color: value >= max ? '#3D3D3B' : '#F5F5F0' }}
        >+</button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  movementName: string
  defaultTarget: number
  defaultReps: number
  prs?: Record<number, number>
}

export default function BuildupSheet({ open, onClose, movementName, defaultTarget, defaultReps, prs }: Props) {
  const [rawTarget, setRawTarget] = useState(String(defaultTarget > 0 ? defaultTarget : ''))
  const [barKg, setBarKg] = useState<BarKg>(20)
  const [nSets, setNSets] = useState(3)
  const [reps, setReps] = useState(defaultReps > 0 ? defaultReps : 5)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setRawTarget(String(defaultTarget > 0 ? defaultTarget : ''))
      setReps(defaultReps > 0 ? defaultReps : 5)
    }
  }, [open, defaultTarget, defaultReps])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320)
  }, [open])

  const target = parseFloat(rawTarget)
  const valid = !isNaN(target) && target > barKg
  const category = getMovementCategory(movementName)
  const sets = valid ? calculateBuildup(target, reps, barKg, nSets, category) : []
  const selectedBar = BARS.find(b => b.kg === barKg)!
  const warning = valid && prs ? checkBuildupWarning(target, reps, prs) : null

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ maxWidth: 430, margin: '0 auto', background: '#111111', borderTop: '1px solid #2A2A2A', maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div style={{ width: 32, height: 3, background: '#3D3D3B' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 shrink-0" style={{ paddingTop: 12, paddingBottom: 14, borderBottom: '1px solid #2A2A2A' }}>
          <div>
            <span className="font-mono font-bold uppercase tracking-[0.18em] text-[10px] text-[#6B6B68] block">Build-up</span>
            <span className="font-sans font-bold text-soft-white" style={{ fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {movementName}
            </span>
          </div>
          <button onClick={onClose} className="text-[#6B6B68] active:text-soft-white" style={{ padding: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 shrink-0" style={{ paddingTop: 16, paddingBottom: 16, borderBottom: '1px solid #2A2A2A' }}>
          {/* Target weight */}
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
            Peso alvo
          </span>
          <div className="flex items-baseline gap-2 mb-4">
            <input
              ref={inputRef}
              type="number" inputMode="decimal"
              value={rawTarget}
              onChange={e => setRawTarget(e.target.value)}
              placeholder="0"
              className="font-mono font-black text-soft-white bg-transparent outline-none"
              style={{ fontSize: 44, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', width: 140, borderBottom: '2px solid #D4FF3A' }}
            />
            <span className="font-mono font-medium text-[#6B6B68] text-[15px]">KG</span>
          </div>
          {rawTarget !== '' && !valid && (
            <span className="font-mono text-[11px] text-[#FF4444] uppercase tracking-wider block mb-3">
              Peso deve ser maior que {barKg} kg (barra vazia)
            </span>
          )}
          {warning && (
            <div className="mb-3" style={{ background: '#1A0E00', border: '1px solid #FF8C00', padding: '10px 14px' }}>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: '#FF8C00' }}>
                ⚠ {warning}
              </span>
            </div>
          )}

          {/* Sets → Reps → Bar (correct order) */}
          <div className="flex items-start gap-5 flex-wrap">
            <Stepper label="Working sets" value={nSets} onChange={setNSets} min={1} max={10} />
            <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={15} />

            <div>
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
                Bar
              </span>
              <div className="flex gap-2">
                {BARS.map(bar => {
                  const active = barKg === bar.kg
                  return (
                    <button
                      key={bar.kg}
                      onClick={() => setBarKg(bar.kg as BarKg)}
                      className="flex items-center gap-1.5 active:opacity-70"
                      style={{ padding: '8px 12px', border: active ? `1px solid ${bar.color}` : '1px solid #2A2A2A', background: active ? '#1A1A1A' : 'transparent' }}
                    >
                      <span style={{ display: 'inline-block', width: 8, height: 8, background: bar.color }} />
                      <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px]" style={{ color: active ? '#F5F5F0' : '#6B6B68' }}>
                        {bar.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sets list */}
        <div className="overflow-y-auto flex-1">
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
                      padding: '11px 20px 13px',
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
                        <span className="font-mono font-black" style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums', color: isTarget ? '#D4FF3A' : '#F5F5F0' }}>{set.weight}</span>
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

              <div className="px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
                  {sets.length - 1} sets · {reps} reps per set · {selectedBar.label} bar
                </span>
              </div>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#3D3D3B]">
                {rawTarget === '' ? 'Enter target weight to calculate' : 'Invalid weight'}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
