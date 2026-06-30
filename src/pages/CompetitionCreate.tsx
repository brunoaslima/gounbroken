import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── FieldBlock ───────────────────────────────────────────────────────────────

function FieldBlock({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>
      <span
        className="font-mono font-bold uppercase block"
        style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68', marginBottom: 8 }}
      >
        {label}{required && <span style={{ color: '#D4FF3A', marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#111111',
  border: '1px solid #2A2A2A',
  color: '#F5F5F0',
  fontFamily: 'inherit',
  fontSize: 15,
  padding: '10px 12px',
  outline: 'none',
}

const INPUT_FOCUSED_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  border: '1px solid #D4FF3A',
}

// ─── FocusInput ───────────────────────────────────────────────────────────────

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={focused ? INPUT_FOCUSED_STYLE : INPUT_STYLE}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...(focused ? INPUT_FOCUSED_STYLE : INPUT_STYLE),
        resize: 'none',
        minHeight: 72,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

// ─── StepperButton ────────────────────────────────────────────────────────────

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 36, height: 36,
          background: '#111111', border: '1px solid #2A2A2A',
          color: value <= min ? '#3D3D3B' : '#F5F5F0',
          fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        −
      </button>
      <div
        className="font-mono font-black flex items-center justify-center"
        style={{
          width: 44, height: 36,
          background: '#111111',
          borderTop: '1px solid #2A2A2A',
          borderBottom: '1px solid #2A2A2A',
          fontSize: 15,
          color: '#F5F5F0',
        }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 36, height: 36,
          background: '#111111', border: '1px solid #2A2A2A',
          color: value >= max ? '#3D3D3B' : '#D4FF3A',
          fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        +
      </button>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CompetitionCreate() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [startDate, setStartDate] = useState(todayPlus(30))
  const [deadline, setDeadline] = useState(todayPlus(20))
  const [minSize, setMinSize] = useState(2)
  const [maxSize, setMaxSize] = useState(4)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && startDate && deadline && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    const { data, error: rpcErr } = await supabase.rpc('create_competition', {
      p_name: name.trim(),
      p_description: description.trim(),
      p_venue: venue.trim(),
      p_start_date: startDate,
      p_registration_deadline: new Date(deadline + 'T23:59:59').toISOString(),
      p_team_min_size: minSize,
      p_team_max_size: maxSize,
    })

    if (rpcErr) {
      setError(rpcErr.message)
      setSaving(false)
      return
    }

    navigate(`/athlete/competitions/${data}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A', color: '#F5F5F0' }}>

      {/* Topbar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A]"
        style={{ height: 52, padding: '8px 16px', background: '#0A0A0A' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]"
          style={{ width: 36, height: 36, background: 'transparent', border: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span
          className="font-mono font-black uppercase"
          style={{ fontSize: 11, letterSpacing: '0.22em', color: '#F5F5F0' }}
        >
          NEW COMPETITION
        </span>
        <div style={{ width: 36 }} />
      </header>

      {/* Form */}
      <div className="flex-1" style={{ paddingBottom: 100 }}>

        {/* Section: Identidade */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D' }}
        >
          01 · IDENTITY
        </div>

        <FieldBlock label="Competition name" required>
          <FocusInput
            type="text"
            placeholder="Ex: Open Box Pinheiros 2025"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
          />
          <span
            className="font-mono block mt-1.5"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: name.length > 60 ? '#FFB800' : '#3D3D3B' }}
          >
            {name.length}/80
          </span>
        </FieldBlock>

        <FieldBlock label="Description">
          <FocusTextarea
            placeholder="General rules, divisions, format..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </FieldBlock>

        <FieldBlock label="Local / Venue">
          <FocusInput
            type="text"
            placeholder="Ex: CF Pinheiros · SP"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            maxLength={80}
          />
        </FieldBlock>

        {/* Section: Datas */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D', marginTop: 8 }}
        >
          02 · DATES
        </div>

        <FieldBlock label="Event date" required>
          <FocusInput
            type="date"
            value={startDate}
            min={today()}
            onChange={e => setStartDate(e.target.value)}
            style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
          />
        </FieldBlock>

        <FieldBlock label="Registration deadline" required>
          <FocusInput
            type="date"
            value={deadline}
            min={today()}
            max={startDate}
            onChange={e => setDeadline(e.target.value)}
            style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
          />
          <span
            className="font-mono block mt-1.5"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: '#3D3D3B' }}
          >
            Must be before the event date
          </span>
        </FieldBlock>

        {/* Section: Equipes */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D', marginTop: 8 }}
        >
          03 · TEAMS
        </div>

        <div className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>
          <div className="flex items-center justify-between">
            <div>
              <span
                className="font-mono font-bold uppercase block"
                style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68', marginBottom: 4 }}
              >
                Minimum size
              </span>
              <span className="font-mono text-[11px]" style={{ color: '#3D3D3B' }}>Athletes per team (min.)</span>
            </div>
            <Stepper value={minSize} min={1} max={maxSize} onChange={v => setMinSize(v)} />
          </div>
        </div>

        <div className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>
          <div className="flex items-center justify-between">
            <div>
              <span
                className="font-mono font-bold uppercase block"
                style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68', marginBottom: 4 }}
              >
                Maximum size
              </span>
              <span className="font-mono text-[11px]" style={{ color: '#3D3D3B' }}>Athletes per team (max.)</span>
            </div>
            <Stepper value={maxSize} min={minSize} max={10} onChange={v => setMaxSize(v)} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="font-mono font-bold uppercase"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: '#FF3B30', padding: '12px 20px', borderBottom: '1px solid #2A2A2A' }}
          >
            {error}
          </div>
        )}

      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 md:relative"
        style={{ background: '#0A0A0A', borderTop: '1px solid #2A2A2A', padding: '12px 16px', paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-between px-5 py-4 active:opacity-80 transition-opacity"
          style={{
            background: canSubmit ? '#D4FF3A' : '#1A1A1A',
            border: canSubmit ? 'none' : '1px solid #2A2A2A',
          }}
        >
          <span
            className="font-mono font-black uppercase"
            style={{ fontSize: 11, letterSpacing: '0.2em', color: canSubmit ? '#0A0A0A' : '#3D3D3B' }}
          >
            {saving ? 'CREATING...' : 'CREATE COMPETITION'}
          </span>
          {!saving && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={canSubmit ? '#0A0A0A' : '#3D3D3B'} strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
          {saving && (
            <div
              className="w-4 h-4 border-2 animate-spin"
              style={{ borderColor: '#0A0A0A', borderTopColor: 'transparent' }}
            />
          )}
        </button>
      </div>
    </div>
  )
}
