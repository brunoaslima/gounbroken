import { useState } from 'react'
import type { TimerConfig } from '@/lib/timerTypes'

// ── Time stepper (MM:SS editable + quick increments) ─────────────────────────

interface TimeStepperProps {
  label: string
  value: number           // seconds
  onChange: (v: number) => void
  min?: number
  max?: number
}

function parseMMSS(raw: string): number | null {
  const trimmed = raw.trim()
  // Accept "MM:SS"
  const mmss = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (mmss) {
    const mm = parseInt(mmss[1])
    const ss = parseInt(mmss[2])
    if (ss > 59) return null
    return mm * 60 + ss
  }
  // Accept plain number → treat as minutes
  const num = parseInt(trimmed)
  if (!isNaN(num) && num > 0) return num * 60
  return null
}

function toMMSS(s: number): string {
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function TimeStepper({ label, value, onChange, min = 15, max = 7200 }: TimeStepperProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const quickAdd = [15, 30, 60, 300] // 15s, 30s, 1m, 5m
  const quickAddLabels = ['+15s', '+30s', '+1m', '+5m']

  function commit(raw: string) {
    const parsed = parseMMSS(raw)
    if (parsed !== null) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
        {label}
      </span>

      {/* Main stepper row */}
      <div className="flex items-stretch" style={{ border: '1px solid #2A2A2A' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 15))}
          style={{ width: 44, background: '#111111', border: 'none', borderRight: '1px solid #2A2A2A', color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
        >−</button>

        {editing ? (
          <input
            autoFocus
            type="text"
            defaultValue={toMMSS(value)}
            className="flex-1 text-center font-mono font-bold text-[#D4FF3A] bg-[#111111] outline-none"
            style={{ fontSize: 18, letterSpacing: '0.04em', border: 'none' }}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(toMMSS(value)); setEditing(true) }}
            className="flex-1 text-center font-mono font-bold text-[#F5F5F0] bg-[#111111]"
            style={{ fontSize: 18, letterSpacing: '0.04em', border: 'none', cursor: 'text' }}
          >
            {toMMSS(value)}
          </button>
        )}

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 15))}
          style={{ width: 44, background: '#111111', border: 'none', borderLeft: '1px solid #2A2A2A', color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
        >+</button>
      </div>

      {/* Quick increments */}
      <div className="flex gap-1.5">
        {quickAdd.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(Math.min(max, value + s))}
            style={{
              flex: 1, height: 28, background: 'transparent',
              border: '1px solid #2A2A2A', color: '#6B6B68',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            {quickAddLabels[i]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Integer stepper (editable + quick increments) ────────────────────────────

interface IntStepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

function IntStepper({ label, value, onChange, min = 1, max = 99 }: IntStepperProps) {
  const [editing, setEditing] = useState(false)

  function commit(raw: string) {
    const n = parseInt(raw)
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
        {label}
      </span>

      <div className="flex items-stretch" style={{ border: '1px solid #2A2A2A' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 44, background: '#111111', border: 'none', borderRight: '1px solid #2A2A2A', color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
        >−</button>

        {editing ? (
          <input
            autoFocus
            type="number"
            defaultValue={value}
            className="flex-1 text-center font-mono font-bold text-[#D4FF3A] bg-[#111111] outline-none"
            style={{ fontSize: 18, letterSpacing: '0.04em', border: 'none' }}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-center font-mono font-bold text-[#F5F5F0] bg-[#111111]"
            style={{ fontSize: 18, letterSpacing: '0.04em', border: 'none', cursor: 'text' }}
          >
            {value}
          </button>
        )}

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width: 44, background: '#111111', border: 'none', borderLeft: '1px solid #2A2A2A', color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
        >+</button>
      </div>

      {/* Quick increments */}
      <div className="flex gap-1.5">
        {[1, 5, 10].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(Math.min(max, value + n))}
            style={{
              flex: 1, height: 28, background: 'transparent',
              border: '1px solid #2A2A2A', color: '#6B6B68',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            +{n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TimerConfig ───────────────────────────────────────────────────────────────

interface Props {
  config: TimerConfig
  onChange: (c: TimerConfig) => void
}

export function TimerConfig({ config, onChange }: Props) {
  const set = (patch: Partial<TimerConfig>) => onChange({ ...config, ...patch })

  switch (config.mode) {
    case 'for_time':
      return <TimeStepper label="Time Cap" value={config.capSeconds} onChange={v => set({ capSeconds: v })} min={60} max={7200} />
    case 'amrap':
      return <TimeStepper label="Duration" value={config.capSeconds} onChange={v => set({ capSeconds: v })} min={60} max={7200} />
    case 'emom':
      return <IntStepper label="Minutes" value={config.rounds} onChange={v => set({ rounds: v })} min={1} max={60} />
    case 'tabata':
      return (
        <div className="flex flex-col gap-4">
          <IntStepper label="Rounds" value={config.rounds} onChange={v => set({ rounds: v })} min={1} max={32} />
          <div style={{ border: '1px solid #2A2A2A', background: '#111111', padding: '10px 14px' }}>
            <span className="font-mono text-[11px] text-[#6B6B68]">
              Work <span style={{ color: '#FF8A00' }}>20s</span> · Rest <span style={{ color: '#4DA3FF' }}>10s</span> · Fixed
            </span>
          </div>
        </div>
      )
    case 'interval':
      return (
        <div className="flex flex-col gap-4">
          <TimeStepper label="Work Time" value={config.workSeconds} onChange={v => set({ workSeconds: v })} min={5} max={1800} />
          <TimeStepper label="Rest Time" value={config.restSeconds} onChange={v => set({ restSeconds: v })} min={5} max={1800} />
          <IntStepper label="Rounds" value={config.rounds} onChange={v => set({ rounds: v })} min={1} max={99} />
        </div>
      )
    case 'stopwatch':
      return (
        <div style={{ border: '1px solid #2A2A2A', background: '#111111', padding: '14px' }}>
          <span className="font-mono text-[11px] text-[#6B6B68]">No configuration needed. Press start.</span>
        </div>
      )
  }
}
