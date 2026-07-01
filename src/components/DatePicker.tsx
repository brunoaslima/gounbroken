import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'

interface Props {
  value: string           // YYYY-MM-DD
  onChange: (v: string) => void
  min?: string            // YYYY-MM-DD inclusive
  max?: string            // YYYY-MM-DD inclusive
  invalid?: boolean
  placeholder?: string
}

/**
 * Parses a `YYYY-MM-DD` date string into a local `Date`.
 *
 * @param s - The date string to parse.
 * @returns A `Date` for `s`, or `undefined` if `s` is empty.
 */
function parseYMD(s: string): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Formats a date as `YYYY-MM-DD`.
 *
 * @param d - The date to format
 * @returns The formatted date string
 */
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formats a date string for display.
 *
 * @param s - A date string in `YYYY-MM-DD` format.
 * @returns The date formatted as `DD/MM/YYYY`, or an empty string if `s` is falsy.
 */
function fmt(s: string): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Renders a date picker with a text field and calendar popover.
 *
 * @param value - The selected date in `YYYY-MM-DD` format.
 * @param onChange - Called with the newly selected date in `YYYY-MM-DD` format.
 * @param min - The earliest selectable date in `YYYY-MM-DD` format.
 * @param max - The latest selectable date in `YYYY-MM-DD` format.
 * @param invalid - Controls the error border style.
 * @param placeholder - The text shown when no date is selected.
 */
export function DatePicker({ value, onChange, min, max, invalid, placeholder = 'DD/MM/YYYY' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = parseYMD(value)
  const disabledMatchers: import('react-day-picker').Matcher[] = []
  const minDate = min ? parseYMD(min) : undefined
  const maxDate = max ? parseYMD(max) : undefined
  if (minDate) disabledMatchers.push({ before: minDate })
  if (maxDate) disabledMatchers.push({ after: maxDate })

  const borderColor = invalid ? '#FF3B30' : open ? '#D4FF3A' : '#2A2A2A'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          background: '#111111',
          border: `1px solid ${borderColor}`,
          color: value ? '#F5F5F0' : '#3D3D3B',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15,
          padding: '10px 12px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.1s',
        }}
      >
        <span>{value ? fmt(value) : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value ? '#F5F5F0' : '#3D3D3B'} strokeWidth="2" strokeLinecap="square">
          <rect x="3" y="4" width="18" height="18" rx="0" ry="0" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 50,
          background: '#111111',
          border: '1px solid #2A2A2A',
          padding: '12px',
          minWidth: 280,
        }}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={d => {
              if (d) { onChange(toYMD(d)); setOpen(false) }
            }}
            defaultMonth={selected ?? (min ? parseYMD(min) : undefined)}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            components={{
              Chevron: ({ orientation }) => (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                  {orientation === 'left'
                    ? <path d="M15 18l-6-6 6-6" />
                    : <path d="M9 18l6-6-6-6" />}
                </svg>
              ),
            }}
            classNames={{
              root:        'rdp-root',
              months:      '',
              month:       '',
              month_grid:  'rdp-grid',
              caption_label: 'rdp-caption',
              nav:         'rdp-nav',
              button_previous: 'rdp-nav-btn',
              button_next:     'rdp-nav-btn',
              weekdays:    'rdp-head-row',
              weekday:     'rdp-head-cell',
              week:        'rdp-row',
              day:         'rdp-cell',
              day_button:  'rdp-day',
              selected:    'rdp-day--selected',
              today:       'rdp-day--today',
              disabled:    'rdp-day--disabled',
              outside:     'rdp-day--outside',
            }}
          />
        </div>
      )}

      <style>{`
        .rdp-root { font-family: 'JetBrains Mono', monospace; }
        .rdp-grid { border-collapse: collapse; width: 100%; }
        .rdp-caption {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: #F5F5F0;
        }
        .rdp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .rdp-nav-btn {
          background: transparent; border: 1px solid #2A2A2A; color: #F5F5F0;
          width: 28px; height: 28px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; font-size: 14px;
        }
        .rdp-nav-btn:hover { border-color: #D4FF3A; color: #D4FF3A; }
        .rdp-head-row { display: grid; grid-template-columns: repeat(7, 1fr); }
        .rdp-head-cell {
          font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #3D3D3B;
          text-align: center; padding: 4px 0 8px;
        }
        .rdp-row { display: grid; grid-template-columns: repeat(7, 1fr); }
        .rdp-cell { text-align: center; padding: 1px; }
        .rdp-day {
          width: 32px; height: 32px; font-size: 12px; font-weight: 600;
          color: #A8A8A4; background: transparent; border: 1px solid transparent;
          cursor: pointer; font-family: 'JetBrains Mono', monospace;
        }
        .rdp-day:hover:not(:disabled) { border-color: #2A2A2A; color: #F5F5F0; }
        .rdp-day--selected { background: #D4FF3A !important; color: #0A0A0A !important; font-weight: 800; border-color: #D4FF3A !important; }
        .rdp-day--today { color: #D4FF3A; }
        .rdp-day--today.rdp-day--selected { color: #0A0A0A !important; }
        .rdp-day--disabled { color: #2A2A2A !important; cursor: default; }
        .rdp-day--outside { color: #2A2A2A; }
      `}</style>
    </div>
  )
}
