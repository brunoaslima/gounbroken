import type { TimerMode } from '@/lib/timerTypes'
import { MODE_LABELS, MODE_DESCRIPTIONS } from '@/lib/timerTypes'

const MODES: TimerMode[] = ['for_time', 'amrap', 'emom', 'tabata', 'interval', 'stopwatch']

interface Props {
  value: TimerMode
  onChange: (mode: TimerMode) => void
}

export function TimerTypePicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {MODES.map(mode => {
        const active = mode === value
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode)}
            style={{
              background: active ? '#D4FF3A' : '#111111',
              border: `1px solid ${active ? '#D4FF3A' : '#2A2A2A'}`,
              padding: '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.1s',
            }}
          >
            <span
              className="font-mono font-black uppercase block"
              style={{ fontSize: 11, letterSpacing: '0.14em', color: active ? '#0A0A0A' : '#F5F5F0' }}
            >
              {MODE_LABELS[mode]}
            </span>
            <span
              className="font-mono block"
              style={{ fontSize: 9, letterSpacing: '0.08em', color: active ? '#3D3D0A' : '#6B6B68', marginTop: 3 }}
            >
              {MODE_DESCRIPTIONS[mode]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
