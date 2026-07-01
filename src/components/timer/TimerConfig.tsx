import type { TimerConfig } from '@/lib/timerTypes'

interface StepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  format?: 'seconds' | 'minutes' | 'integer'
}

function fmt(v: number, format: StepperProps['format']) {
  if (format === 'integer') return String(v)
  if (format === 'minutes') {
    const mm = Math.floor(v / 60)
    const ss = v % 60
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  // seconds
  return String(v) + 's'
}

function Stepper({ label, value, onChange, min = 1, max = 3600, format = 'seconds' }: StepperProps) {
  const step = format === 'integer' ? 1 : 15
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
        {label}
      </span>
      <div className="flex items-center" style={{ border: '1px solid #2A2A2A' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          style={{
            width: 44, height: 44, background: '#111111', border: 'none',
            color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0,
          }}
        >
          −
        </button>
        <span
          className="flex-1 text-center font-mono font-bold text-[#F5F5F0]"
          style={{ fontSize: 18, letterSpacing: '0.04em' }}
        >
          {fmt(value, format)}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          style={{
            width: 44, height: 44, background: '#111111', border: 'none',
            color: '#F5F5F0', fontSize: 20, cursor: 'pointer', flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

interface Props {
  config: TimerConfig
  onChange: (c: TimerConfig) => void
}

export function TimerConfig({ config, onChange }: Props) {
  const set = (patch: Partial<TimerConfig>) => onChange({ ...config, ...patch })

  switch (config.mode) {
    case 'for_time':
      return (
        <Stepper label="Time Cap" value={config.capSeconds} onChange={v => set({ capSeconds: v })}
          min={60} max={7200} format="minutes" />
      )
    case 'amrap':
      return (
        <Stepper label="Duration" value={config.capSeconds} onChange={v => set({ capSeconds: v })}
          min={60} max={7200} format="minutes" />
      )
    case 'emom':
      return (
        <Stepper label="Minutes" value={config.rounds} onChange={v => set({ rounds: v })}
          min={1} max={60} format="integer" />
      )
    case 'tabata':
      return (
        <div className="flex flex-col gap-4">
          <Stepper label="Rounds" value={config.rounds} onChange={v => set({ rounds: v })}
            min={1} max={32} format="integer" />
          <div className="flex gap-3 border border-[#2A2A2A] bg-[#111111] p-3.5">
            <span className="font-mono text-[11px] text-[#6B6B68]">
              Work <span className="text-[#FF8A00]">20s</span> · Rest <span className="text-[#4DA3FF]">10s</span> · Fixed
            </span>
          </div>
        </div>
      )
    case 'interval':
      return (
        <div className="flex flex-col gap-4">
          <Stepper label="Work Time" value={config.workSeconds} onChange={v => set({ workSeconds: v })}
            min={5} max={1800} format="seconds" />
          <Stepper label="Rest Time" value={config.restSeconds} onChange={v => set({ restSeconds: v })}
            min={5} max={1800} format="seconds" />
          <Stepper label="Rounds" value={config.rounds} onChange={v => set({ rounds: v })}
            min={1} max={99} format="integer" />
        </div>
      )
    case 'stopwatch':
      return (
        <div className="border border-[#2A2A2A] bg-[#111111] p-4">
          <span className="font-mono text-[11px] text-[#6B6B68]">No configuration needed. Press start.</span>
        </div>
      )
  }
}
