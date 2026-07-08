import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useUnbrokenSets } from '@/hooks/useUnbrokenSets'
import type { UnbrokenSet } from '@/types'

type ChartMode = 'reps' | 'rps'

function fmtTime(secs: number): string {
  if (secs >= 60) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }
  return `${secs}s`
}

function rpsStr(reps: number, secs: number): string {
  return secs > 0 ? (reps / secs).toFixed(2) : '—'
}

function formatDateShort(iso: string): { day: string; mon: string } {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return { day, mon }
}

export default function UnbrokenDetail() {
  const { id: movementId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { movements } = useMovements(user?.id)
  const { getSetsForMovement, getPRForMovement, addSet, deleteSet } = useUnbrokenSets(user?.id)

  const [chartMode, setChartMode] = useState<ChartMode>('reps')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shReps, setShReps] = useState('')
  const [shMin, setShMin] = useState('')
  const [shSec, setShSec] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const repsInputRef = useRef<HTMLInputElement>(null)

  const movement = movements.find(m => m.id === movementId && m.user_id === user?.id)
  const sets = movementId ? getSetsForMovement(movementId) : []
  const pr = movementId ? getPRForMovement(movementId) : null

  // If movement not found and movements loaded, redirect
  useEffect(() => {
    if (!movement && movements.length > 0) navigate('/athlete/add', { replace: true })
  }, [movement, movements.length, navigate])

  const shRepsNum = parseInt(shReps) || 0
  const shMinNum = parseInt(shMin) || 0
  const shSecNum = parseInt(shSec) || 0
  const shTotalSec = shMinNum * 60 + shSecNum
  const shRps = shRepsNum > 0 && shTotalSec > 0 ? rpsStr(shRepsNum, shTotalSec) : null
  const shIsNewPR = shRepsNum > 0 && (!pr || shRepsNum > pr.reps)
  const shCanSave = shRepsNum >= 1 && shTotalSec >= 1

  function openSheet() {
    setShReps(''); setShMin(''); setShSec(''); setSaveError(null)
    setSheetOpen(true)
    setTimeout(() => repsInputRef.current?.focus(), 120)
  }

  async function handleSave() {
    if (!movementId || !shCanSave || saving) return
    setSaving(true)
    setSaveError(null)
    const { error } = await addSet(movementId, shRepsNum, shTotalSec)
    setSaving(false)
    if (error) { setSaveError(error); return }
    setSheetOpen(false)
  }

  if (!movement) return null

  const prReps = pr?.reps ?? null
  const sortedByReps = [...sets].sort((a, b) => b.reps - a.reps)

  return (
    <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 border-b border-[#1A1A1A]" style={{ height: 52, flexShrink: 0 }}>
        <button onClick={() => navigate('/athlete/add')} className="text-soft-white text-[22px] leading-none px-1">←</button>
        <span className="font-bold text-[15px] text-soft-white truncate mx-3">{movement.name}</span>
        <button
          onClick={openSheet}
          className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] px-3 py-2"
          style={{ background: '#D4FF3A', color: '#0A0A0A' }}
        >
          + SET
        </button>
      </header>

      {/* PR Block */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
        <PRCol label="PR Reps" value={pr ? String(pr.reps) : '—'} highlight />
        <PRCol label="Tempo" value={pr ? fmtTime(pr.time_seconds) : '—'} />
        <PRCol label="Reps/sec" value={pr ? rpsStr(pr.reps, pr.time_seconds) : '—'} />
      </div>

      {/* Chart */}
      <div className="border-b border-[#1A1A1A] bg-[#111]" style={{ padding: '12px 16px 10px', flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#888]">Evolução</span>
          <div style={{ display: 'flex' }}>
            <ChartToggleBtn active={chartMode === 'reps'} onClick={() => setChartMode('reps')}>REPS</ChartToggleBtn>
            <ChartToggleBtn active={chartMode === 'rps'} onClick={() => setChartMode('rps')}>REPS/SEC</ChartToggleBtn>
          </div>
        </div>
        <Chart sets={sets} mode={chartMode} />
      </div>

      {/* Sets list */}
      <div className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#888] border-b border-[#1A1A1A] px-4 py-2.5" style={{ flexShrink: 0 }}>
        Todos os sets
      </div>

      <div className="flex-1 overflow-y-auto">
        {sets.length === 0 ? (
          <p className="px-5 py-6 font-mono text-[10px] uppercase tracking-widest text-[#444]">Sem sets ainda</p>
        ) : (
          [...sets].map((s) => {
            const isPR = s.reps === prReps
            const rank = sortedByReps.findIndex(x => x.reps === s.reps)
            const rpsColor = isPR ? '#D4FF3A' : rank < 3 ? '#888' : '#555'
            const { day, mon } = formatDateShort(s.created_at)
            const confirming = confirmDeleteId === s.id
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 56px 60px 1fr auto',
                  alignItems: 'center',
                  height: 52,
                  padding: '0 16px',
                  borderBottom: '1px solid #111',
                  borderLeft: isPR ? '2px solid #D4FF3A' : '2px solid transparent',
                }}
              >
                <div className="font-mono text-[10px] text-[#555] leading-tight">
                  {day}<br /><span className="text-[9px] text-[#333]">{mon}</span>
                </div>
                <span className="font-bold text-[22px] text-soft-white">{s.reps}</span>
                <span className="font-mono font-bold text-[13px] text-[#888]">{fmtTime(s.time_seconds)}</span>
                <span className="font-mono text-[11px] text-right" style={{ color: rpsColor }}>{rpsStr(s.reps, s.time_seconds)}/s</span>
                {confirming ? (
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => { setConfirmDeleteId(null); deleteSet(s.id).then(r => { if (r.error) console.error('deleteSet error:', r.error) }) }}
                      className="font-mono font-bold uppercase text-[9px] tracking-[0.1em] px-2 py-1"
                      style={{ background: '#FF3B30', color: '#fff' }}
                    >
                      DEL
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="font-mono font-bold uppercase text-[9px] tracking-[0.1em] text-[#555]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="ml-3 flex items-center justify-center text-[#333] active:text-[#FF3B30] transition-colors"
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', flexShrink: 0 }}
                    aria-label="Delete set"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M1 1l10 10M11 1L1 11" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 40 }}
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: '#111',
          borderTop: '1px solid #2A2A2A',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.24s ease-out',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        {/* Sheet header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[#1A1A1A]">
          <div>
            <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#888] block">Novo set</span>
            <span className="font-bold text-[17px] text-soft-white mt-0.5 block">{movement.name}</span>
          </div>
          <button
            onClick={() => setSheetOpen(false)}
            className="font-mono text-[16px] text-[#888] border border-[#2A2A2A] flex items-center justify-center active:text-soft-white"
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        <div className="px-4 pt-3">
          {/* Reps */}
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#888] block mb-1.5" id="reps-label">Reps unbroken</span>
          <input
            ref={repsInputRef}
            type="number"
            inputMode="numeric"
            value={shReps}
            onChange={e => setShReps(e.target.value)}
            placeholder="0"
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-soft-white placeholder-[#2A2A2A] focus:outline-none focus:border-lime text-center"
            style={{ height: 80, fontSize: 52, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}
            aria-labelledby="reps-label"
          />

          {/* Time */}
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#888] block mt-3 mb-1.5">Tempo</span>
          <div className="flex items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#555]" id="min-label">MIN</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={shMin}
                onChange={e => setShMin(e.target.value)}
                placeholder="00"
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-soft-white placeholder-[#333] focus:outline-none focus:border-lime text-center font-mono font-bold"
                style={{ width: 90, height: 52, fontSize: 28 }}
                aria-labelledby="min-label"
              />
            </div>
            <span className="font-bold text-[32px] text-[#2A2A2A] pb-1">:</span>
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#555]" id="sec-label">SEC</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={shSec}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setShSec(isNaN(v) ? '' : String(Math.min(59, v)))
                }}
                placeholder="00"
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-soft-white placeholder-[#333] focus:outline-none focus:border-lime text-center font-mono font-bold"
                style={{ width: 90, height: 52, fontSize: 28 }}
                aria-labelledby="sec-label"
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="flex items-center justify-between border border-[#1A1A1A] bg-[#0A0A0A] px-3.5 mt-2.5"
            style={{ height: 38, opacity: shRps ? 1 : 0 }}
          >
            {shIsNewPR && (
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] px-1.5 py-0.5" style={{ background: '#D4FF3A', color: '#0A0A0A' }}>
                NOVO PR
              </span>
            )}
            <span className="font-mono font-bold text-[14px] ml-auto" style={{ color: '#D4FF3A' }}>
              {shRps ?? '—'} reps/sec
            </span>
          </div>

          {saveError && (
            <p className="font-mono text-[10px] text-red-400 mt-2">{saveError}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!shCanSave || saving}
            className="w-full mt-3 font-bold uppercase tracking-[0.06em] text-[14px] disabled:opacity-30"
            style={{
              height: 50,
              background: shCanSave ? '#D4FF3A' : '#1A1A1A',
              color: shCanSave ? '#0A0A0A' : '#555',
              fontFamily: '"Space Grotesk", sans-serif',
              border: 'none',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar set'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PRCol({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 3, borderRight: '1px solid #2A2A2A' }}>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[9px] text-[#888]">{label}</span>
      <span className="font-bold leading-none" style={{ fontSize: 32, color: highlight ? '#D4FF3A' : '#F5F5F0' }}>{value}</span>
    </div>
  )
}

function ChartToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] px-2.5 py-1.5 border border-[#2A2A2A]"
      style={{
        background: active ? '#D4FF3A' : '#1A1A1A',
        color: active ? '#0A0A0A' : '#555',
        borderColor: active ? '#D4FF3A' : '#2A2A2A',
      }}
    >
      {children}
    </button>
  )
}

function Chart({ sets, mode }: { sets: UnbrokenSet[]; mode: ChartMode }) {
  if (sets.length < 2) {
    return (
      <svg width="100%" height="72" viewBox="0 0 343 72">
        <text x="171" y="40" fontFamily="JetBrains Mono" fontSize="10" fill="#333" textAnchor="middle">
          {sets.length === 0 ? 'Sem sets ainda' : 'Adicione mais sets para ver o gráfico'}
        </text>
      </svg>
    )
  }

  // Show sets oldest → newest
  const ordered = [...sets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const data = ordered.map(s => mode === 'reps' ? s.reps : s.time_seconds > 0 ? s.reps / s.time_seconds : 0)
  const W = 343, H = 60, pad = 10
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - ((v - mn) / range) * (H - pad * 2),
  ])
  const maxI = data.indexOf(mx)
  const poly = pts.map(p => p.join(',')).join(' ')
  const first = formatDateShort(ordered[0].created_at)
  const last = formatDateShort(ordered[ordered.length - 1].created_at)

  return (
    <svg width="100%" height="84" viewBox="0 0 343 84">
      <line x1={pad} y1={H} x2={W - pad} y2={H} stroke="#1A1A1A" strokeWidth="1" />
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3,3" />
      <polyline points={poly} fill="none" stroke="#D4FF3A" strokeWidth="2" />
      <circle cx={pts[maxI][0]} cy={pts[maxI][1]} r={8} fill="#D4FF3A" opacity={0.2} />
      <circle cx={pts[maxI][0]} cy={pts[maxI][1]} r={3.5} fill="#D4FF3A" />
      <text x={pad} y={76} fontFamily="JetBrains Mono" fontSize="9" fill="#555">{first.day} {first.mon}</text>
      <text x={W - pad} y={76} fontFamily="JetBrains Mono" fontSize="9" fill="#555" textAnchor="end">{last.day} {last.mon}</text>
    </svg>
  )
}
